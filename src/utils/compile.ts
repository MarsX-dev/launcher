import { SourceMapPayload } from 'module';
import path from 'path';
import ts from 'typescript';
import { config } from '../configuration';
import { SfcBlock } from './sfc';
import { assert, writeFileMakeDir } from './utils';

function genSourceMapComment(sourceMap: SourceMapPayload): string {
  return `\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(JSON.stringify(sourceMap)).toString('base64')}`;
}

export function transpileTypescript(
  sourceCode: string,
  options?: {
    sourceRoot?: string;
    originalFilePath?: string;
    compiledFilePath?: string;
    lineOffset?: number | undefined;
  },
): string {
  const compiledFilePath = options?.compiledFilePath || '<UNKNOWN>.js';
  const originalFilePath = options?.originalFilePath || '<UNKNOWN>.ts';

  if (options?.lineOffset) {
    sourceCode = '\n'.repeat(options.lineOffset) + sourceCode;
  }

  const transpiled = ts.transpileModule(sourceCode, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.Latest,
      esModuleInterop: true,
      sourceMap: true,
      // inlineSources: true,
      // inlineSourceMap: true,
    },
  });
  assert(transpiled.sourceMapText);

  const sourceMap: SourceMapPayload = JSON.parse(transpiled.sourceMapText);
  sourceMap.sourceRoot = options?.sourceRoot || '';
  sourceMap.file = compiledFilePath;
  sourceMap.sources = [originalFilePath];
  const sourceMapComment = genSourceMapComment(sourceMap);
  return transpiled.outputText.replace(/\n\/\/# sourceMappingURL=.+/, '') + sourceMapComment;
}

export async function compileSfcSource(sfcBlock: SfcBlock, sourceId: string): Promise<string> {
  const sourceCode = sfcBlock.sources[sourceId];
  if (!sourceCode) throw new Error(`Source code block ${sourceId} not found in ${sfcBlock.identity.filePath}`);

  const compiledFilePath = path.join(config.cacheDir, 'compiled', `${sfcBlock.identity.filePath}.${sourceId}.js`);
  const originalFilePath = path.join(config.blocksDir, sfcBlock.identity.filePath);
  const code = transpileTypescript(sourceCode.source, { compiledFilePath, originalFilePath, lineOffset: sourceCode.lineOffset });

  await writeFileMakeDir(compiledFilePath, code, 'utf-8');
  return compiledFilePath;
}
