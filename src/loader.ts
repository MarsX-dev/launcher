import axios from 'axios';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import stringify from 'json-stable-stringify';
import _ from 'lodash';
import path from 'path';
import { config, ImportProjectConfig } from './configuration';
import { parseSFC, SfcBlock } from './utils/sfc';
import { isFile, listFilesRecursive, writeFileMakeDir } from './utils/utils';
import { convertV3ToSfc, V3MongoBlock } from './utils/v3';

async function downloadFromExternal(externalImport: ImportProjectConfig): Promise<SfcBlock[]> {
  const params = { api_key: externalImport.api_key, git_commit_ish: externalImport.git_commit_ish || '' };

  console.log(`Downloading blocks from ${externalImport.url}`);
  try {
    const v4Resp = await axios.get<SfcBlock[]>(`${externalImport.url}/api/GetExportedAppBlocksV4`, { params });
    return v4Resp.data;
  } catch (e) {
    console.log(`${externalImport.url} does not support V4, fallback to V3`);
  }

  const v3Resp = await axios.get<V3MongoBlock[]>(`${externalImport.url}/api/GetExportedAppBlocks`, { params });
  return v3Resp.data.map(b => convertV3ToSfc(b));
}

async function loadCachedOrDownload(externalImport: ImportProjectConfig): Promise<SfcBlock[]> {
  const hash = crypto.createHash('md5').update(stringify(externalImport)).digest('hex');
  const cacheFileName = `${externalImport.name}_${externalImport.git_commit_ish}_${hash}.json`.replace(/[^\w.]+/g, '_');
  const cacheFilePath = path.join(config.cacheDir, 'imports', cacheFileName);

  if (await isFile(cacheFilePath)) {
    const content = await fs.readFile(cacheFilePath);
    console.log(`Loading cached blocks from ${externalImport.url}`);
    return JSON.parse(content.toString('utf-8'));
  }

  const data = await downloadFromExternal(externalImport);
  console.log(`Downloaded ${data.length} blocks from ${externalImport.url}`);

  await writeFileMakeDir(cacheFilePath, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}

async function downloadAll(externalImports: ImportProjectConfig[]) {
  const responses = await Promise.all(externalImports.map(loadCachedOrDownload));
  return _.flatten(responses);
}

async function readBlockFile(blocksDir: string, filePath: string): Promise<SfcBlock> {
  const content = await fs.readFile(filePath);
  const relPath = path.relative(blocksDir, filePath);
  return parseSFC(relPath, content);
}

async function readBlockFiles(blocksDir: string) {
  const files = await listFilesRecursive(blocksDir);
  return await Promise.all(files.filter(f => !path.basename(f).startsWith('.')).map(f => readBlockFile(blocksDir, f)));
}

export async function loadAllBlocks(): Promise<SfcBlock[]> {
  const externalBlocks = await downloadAll(config.importProjects);
  const localBlocks = await readBlockFiles(config.blocksDir);
  return [...externalBlocks, ...localBlocks];
}
