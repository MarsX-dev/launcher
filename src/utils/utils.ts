import { promises as fs } from 'fs';
import _ from 'lodash';
import { Abortable } from 'node:events';
import { Mode, ObjectEncodingOptions, OpenMode } from 'node:fs';
import { Stream } from 'node:stream';
import path from 'path';

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

export async function listFilesRecursive(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir);

  const files = await Promise.all(
    entries.map(async (entry): Promise<string[]> => {
      const entryPath = path.resolve(dir, entry);
      return (await fs.stat(entryPath)).isDirectory() ? listFilesRecursive(entryPath) : [entryPath];
    }),
  );
  return _.flatten(files);
}

export async function isFile(filePath: string): Promise<boolean> {
  try {
    return (await fs.stat(filePath)).isFile();
  } catch (e) {
    return false;
  }
}

export async function isDirectory(dirPath: string): Promise<boolean> {
  try {
    return (await fs.stat(dirPath)).isDirectory();
  } catch (e) {
    return false;
  }
}

export async function writeFileMakeDir(
  filePath: string,
  data:
    | string
    | NodeJS.ArrayBufferView
    | Iterable<string | NodeJS.ArrayBufferView>
    | AsyncIterable<string | NodeJS.ArrayBufferView>
    | Stream,
  options?:
    | (ObjectEncodingOptions & {
        mode?: Mode | undefined;
        flag?: OpenMode | undefined;
      } & Abortable)
    | BufferEncoding
    | null,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, data, options);
}
