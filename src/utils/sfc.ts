import { CompilerError } from '@vue/compiler-core';
import JSON5 from 'json5';
import _ from 'lodash';
import path from 'path';
import { escapeCloseTag, escapeHtmlAttr, parseVueLike, stableHtmlAttributes, stablePrettyJson, unescapeCloseTag } from './textUtils';

export const METADATA_SECTION_ID = 'metadata';
export const MARS_SFC_EXT = 'mars';

const SAVE_EMPTY_SOURCES = true;

export type SfcPath = {
  folder: string;
  name: string;
  blockTypeName: string;
  ext: string;
  filePath: string;
};

export type SfcSource = {
  source: string;
  lang: keyof typeof LANG_TAG_MAP | string | undefined;
  props?: Record<string, string | undefined>;
  lineOffset?: number;
};

export type SfcBlock = { path: SfcPath } & (
  | { metadata: Record<string, unknown>; jsons: Record<string, unknown>; sources: Record<string, SfcSource>; rawContent: null }
  | { metadata: EmptyObject; jsons: EmptyObject; sources: EmptyObject; rawContent: Buffer }
);

export function parseSfcPath(filePath: string): SfcPath {
  // Blog/BlogPost.page.mars => {folder:"Blog", name: "BlogPost", blockTypeName: "page", ext: "mars", fullName: "Blog.BlogPost"}
  const originalParsed = path.parse(filePath);
  const withoutExt = originalParsed.name;
  const ext = originalParsed.ext.slice(1);

  const parsed = path.parse(withoutExt);
  if (!parsed.name || !parsed.ext) throw new Error(`Invalid block file path: ${filePath}`);
  const blockTypeName = parsed.ext.slice(1);

  return {
    folder: originalParsed.dir,
    name: parsed.name,
    blockTypeName,
    ext,
    filePath,
  };
}

export function serializeSfcPath(identity: SfcPath): string {
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

export function parseSFC(filePath: string, content: Buffer): SfcBlock {
  const sfcPath = parseSfcPath(filePath);
  if (sfcPath.ext !== MARS_SFC_EXT) {
    return { path: sfcPath, metadata: {}, jsons: {}, sources: {}, rawContent: content };
  }

  const block: SfcBlock = {
    path: parseSfcPath(filePath),
    metadata: {},
    jsons: {},
    sources: {},
    rawContent: null,
  };
  const seenIds = new Set<string>();
  const errors: (CompilerError | SyntaxError)[] = [];

  for (const node of parseVueLike(content.toString('utf-8'), errors)) {
    const { id: sectionId, lang, ...props } = node.props;

    if (!sectionId) {
      errors.push({ name: `missing-id`, message: `Id property is missing`, code: 0, loc: node.loc });
      continue;
    }
    if (seenIds.has(sectionId)) {
      errors.push({ name: `duplicate-id`, message: `Duplicate section id: ${sectionId}`, code: 0, loc: node.loc });
      continue;
    }
    seenIds.add(sectionId);

    if (node.tag === 'json') {
      try {
        const jsonData = JSON5.parse(node.content);
        if (sectionId === METADATA_SECTION_ID) {
          block.metadata = jsonData;
        } else {
          block.jsons[sectionId] = jsonData;
        }
      } catch (e) {
        errors.push({ name: 'invalid-json', message: `${e}`, code: 0, loc: node.loc });
      }
    } else {
      const source = unescapeCloseTag(node.content.slice(1, -1), node.tag);
      const lineOffset = node.loc.start.line;
      block.sources[sectionId] = { source, lang, props, lineOffset };
    }
  }

  if (errors.length) {
    throw new Error(`Parsing SFC ${filePath} failed with ${JSON.stringify(errors)}`);
  }

  return block;
}

export function serializeSfc(block: SfcBlock): { filePath: string; content: Buffer } {
  const filePath = serializeSfcPath(block.path);
  if (block.path.ext !== MARS_SFC_EXT) {
    if (block.rawContent === null) throw new Error(`SfcBlock must have rawContent if ext!="${MARS_SFC_EXT}"`);
    return { filePath, content: block.rawContent };
  }

  if (block.rawContent !== null) throw new Error(`SfcBlock cannot have rawContent if ext=="${MARS_SFC_EXT}"`);

  let content = '';

  for (const [name, source] of [[METADATA_SECTION_ID, block.metadata] as const, ..._.sortBy(Object.entries(block.jsons), e => e[0])]) {
    const jsonStr = stablePrettyJson(source);
    content += `<json id="${escapeHtmlAttr(name)}">\n${jsonStr}</json>\n\n`;
  }

  for (const [name, source] of _.sortBy(Object.entries(block.sources), e => e[0])) {
    if (!SAVE_EMPTY_SOURCES && !source.source.trim()) continue;
    const tag = (LANG_TAG_MAP as Record<string, string>)[source.lang || ''] || 'text';
    const id = escapeHtmlAttr(name);
    const lang = escapeHtmlAttr(source.lang || '');
    const props = stableHtmlAttributes(source.props);
    const text = escapeCloseTag(source.source, tag);
    content += `<${tag} id="${id}" lang="${lang}"${props}>\n${text}\n</${tag}>\n\n`;
  }

  return { filePath, content: Buffer.from(content, 'utf-8') };
}
