import { CompilerError, TextModes } from '@vue/compiler-core';
import * as CompilerDOM from '@vue/compiler-dom';
import { NodeTypes } from '@vue/compiler-dom';
import stringify from 'json-stable-stringify';
import JSON5 from 'json5';
import _ from 'lodash';
import path from 'path';
import prettier, { Options } from 'prettier';
import { escapeCloseTag, escapeHtmlAttr, unescapeCloseTag } from './utils';

export const METADATA = 'metadata';
export const SFC_EXT = 'vue';
const SAVE_EMPTY_SOURCES = true;

export type SfcIdentity = {
  folder: string;
  name: string;
  blockTypeName: string;
  ext: string;
  // Derived
  fullName: string;
  filePath: string;
};

export function parseSfcIdentity(filePath: string): SfcIdentity {
  // Blog/BlogPost.page.vue => {id: "BlogPost.page", folder:"Blog", name: "BlogPost", blockTypeName: "page", ext: "vue", fullName: "Blog.BlogPost"}
  const originalParsed = path.parse(filePath);
  const withoutExt = originalParsed.name;
  const ext = originalParsed.ext.slice(1);

  const parsed = path.parse(withoutExt);
  if (!parsed.name || !parsed.ext) throw new Error(`Invalid block file path: ${filePath}`);
  const blockTypeName = parsed.ext.slice(1);

  const namespace = originalParsed.dir.replace(/\//g, '.');
  const fullName = namespace.length > 0 ? `${namespace}.${parsed.name}` : parsed.name;
  return {
    folder: originalParsed.dir,
    name: parsed.name,
    blockTypeName,
    ext,
    fullName,
    filePath,
  };
}

export function serializeSfcIdentity(identity: SfcIdentity): string {
  return path.join(identity.folder, `${identity.name}.${identity.blockTypeName}.${identity.ext}`);
}

type EmptyObject = {
  [K in string]: never;
};

const LANG_TAG_MAP = {
  html: 'html',
  pug: 'template',
  js: 'script',
  jsx: 'script',
  ts: 'script',
  tsx: 'script',
  css: 'style',
  scss: 'style',
  less: 'style',
  sass: 'style',
  stylus: 'style',
  text: 'text',
};

export type SfcSource = { source: string; lang: keyof typeof LANG_TAG_MAP | string | undefined; lineOffset?: number };

export type SfcBlock = { identity: SfcIdentity } & (
  | { metadata: Record<string, unknown>; jsons: Record<string, unknown>; sources: Record<string, SfcSource>; rawContent: null }
  | { metadata: EmptyObject; jsons: EmptyObject; sources: EmptyObject; rawContent: Buffer }
);

function getNodeAttr(node: CompilerDOM.ElementNode, attr: string) {
  return node.props.map(p => (p.name == attr && p.type === NodeTypes.ATTRIBUTE ? p.value?.content : undefined)).find(p => !!p);
}

export function parseSFC(filePath: string, content: Buffer): SfcBlock {
  const identity = parseSfcIdentity(filePath);
  if (identity.ext !== SFC_EXT) {
    return { identity, metadata: {}, jsons: {}, sources: {}, rawContent: content };
  }

  const errors: (CompilerError | SyntaxError)[] = [];

  const ast = CompilerDOM.parse(content.toString('utf-8'), {
    // there are no components at SFC parsing level
    isNativeTag: () => true,
    // preserve all whitespaces
    isPreTag: () => true,
    getTextMode: () => TextModes.RAWTEXT,
    onError: e => errors.push(e),
  });

  const block: SfcBlock = {
    identity: parseSfcIdentity(filePath),
    metadata: {},
    jsons: {},
    sources: {},
    rawContent: null,
  };
  const seenIds = new Set<string>();

  ast.children.forEach(node => {
    if (node.type === NodeTypes.ELEMENT) {
      const child = node.children.length === 1 ? node.children[0] : null;
      const content = child && child.type === NodeTypes.TEXT ? child.content : null;

      if (content) {
        const sectionId = getNodeAttr(node, 'id');

        if (!sectionId) {
          errors.push({ name: `missing-id`, message: `Id property is missing`, code: 0, loc: node.loc });
          return;
        }
        if (seenIds.has(sectionId)) {
          errors.push({ name: `duplicate-id`, message: `Duplicate section id: ${sectionId}`, code: 0, loc: node.loc });
          return;
        }
        seenIds.add(sectionId);

        if (node.tag === 'json') {
          try {
            const jsonData = JSON5.parse(content);
            if (sectionId === METADATA) {
              block.metadata = jsonData;
            } else {
              block.jsons[sectionId] = jsonData;
            }
          } catch (e) {
            errors.push({ name: 'invalid-json', message: `${e}`, code: 0, loc: node.loc });
          }
        } else {
          const source = unescapeCloseTag(content.slice(1, -1), node.tag);
          const lang = getNodeAttr(node, 'lang');
          const lineOffset = node.loc.start.line;
          block.sources[sectionId] = { source, lang, lineOffset };
        }
      }
    }
  });

  if (errors.length) {
    throw new Error(`Parsing SFC ${filePath} failed with ${JSON.stringify(errors)}`);
  }

  return block;
}

const PRETTIER_JSON_CONFIG: Options = { parser: 'json5', printWidth: 120, trailingComma: 'all' };

export function serializeSfc(block: SfcBlock): { filePath: string; content: Buffer } {
  const filePath = serializeSfcIdentity(block.identity);
  if (block.identity.ext !== SFC_EXT) {
    if (block.rawContent === null) throw new Error(`SfcBlock must have rawContent if ext!="${SFC_EXT}"`);
    return { filePath, content: block.rawContent };
  }

  if (block.rawContent !== null) throw new Error(`SfcBlock cannot have rawContent if ext=="${SFC_EXT}"`);

  let content = '';

  for (const [name, source] of [[METADATA, block.metadata] as const, ..._.sortBy(Object.entries(block.jsons), e => e[0])]) {
    const jsonStr = prettier.format('(' + stringify(source) + ')', PRETTIER_JSON_CONFIG);
    content += `<json id="${escapeHtmlAttr(name)}">\n${jsonStr}</json>\n\n`;
  }

  for (const [name, source] of _.sortBy(Object.entries(block.sources), e => e[0])) {
    if (!SAVE_EMPTY_SOURCES && !source.source.trim()) continue;
    const tag = (LANG_TAG_MAP as Record<string, string>)[source.lang || ''] || 'script';
    content += `<${tag} id="${escapeHtmlAttr(name)}" lang="${source.lang}">\n${escapeCloseTag(source.source, tag)}\n</${tag}>\n\n`;
  }

  return { filePath, content: Buffer.from(content, 'utf-8') };
}
