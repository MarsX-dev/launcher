import { CompilerError, TextModes } from '@vue/compiler-core';
import * as CompilerDOM from '@vue/compiler-dom';
import { NodeTypes } from '@vue/compiler-dom';
import stringify from 'json-stable-stringify';
import _ from 'lodash';
import prettier, { Options } from 'prettier';

export function assert(value: unknown, message = 'value must be defined'): asserts value {
  if (!value) {
    throw new Error(message);
  }
}

export function escapeCloseTag(str: string, tag: string): string {
  return str.replaceAll(`</${tag}>`, `</ ${tag}>`);
}

export function unescapeCloseTag(str: string, tag: string): string {
  return str.replaceAll(`</ ${tag}>`, `</${tag}>`);
}

export function escapeHtmlAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const PRETTIER_JSON_CONFIG: Options = { parser: 'json5', printWidth: 120, trailingComma: 'all' };

export function prettifyJson(json: string): string {
  return prettier.format(`(${json})`, PRETTIER_JSON_CONFIG);
}

export function stableJson(data: unknown): string {
  return stringify(data);
}

export function stablePrettyJson(data: unknown): string {
  return prettifyJson(stableJson(data));
}

export function stableHtmlAttributes(attrs: Record<string, string | undefined | null> | undefined): string {
  let result = '';
  if (attrs) {
    for (const [name, value] of _.sortBy(Object.entries(attrs), e => e[0])) {
      if (value) {
        result += ` ${name}="${escapeHtmlAttr(value)}"`;
      }
    }
  }
  return result;
}

export function parseVueLike(content: string, errors: (CompilerError | SyntaxError)[]) {
  const ast = CompilerDOM.parse(content, {
    // there are no components at SFC parsing level
    isNativeTag: () => true,
    // preserve all whitespaces
    isPreTag: () => true,
    getTextMode: () => TextModes.RAWTEXT,
    onError: e => errors.push(e),
  });

  const result = [];

  for (const node of ast.children) {
    if (node.type === NodeTypes.ELEMENT) {
      const child = node.children.length === 1 ? node.children[0] : null;
      const content = child && child.type === NodeTypes.TEXT ? child.content : null;

      if (content) {
        const props: Record<string, string> = {};
        for (const prop of node.props) {
          if (prop.type === NodeTypes.ATTRIBUTE && prop.value) {
            props[prop.name] = prop.value.content;
          }
        }
        result.push({ tag: node.tag, props, content, loc: node.loc });
      }
    }
  }

  return result;
}
