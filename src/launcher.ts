import { config } from './configuration';
import { loadAllBlocks } from './loader';
import { compileSfcSource, transpileTypescript } from './utils/compile';
import { parseSFC, serializeSfc } from './utils/sfc';
import { writeFileMakeDir } from './utils/fileUtils';
import { assert } from './utils/textUtils';
import { convertSfcToV3, convertV3ToSfc } from './utils/v3';

const LAUNCHER_UTILS = {
  config,
  parseSFC,
  serializeSfc,
  convertV3ToSfc,
  convertSfcToV3,
  transpileTypescript,
  compileSfcSource,
  writeFileMakeDir,
};

export async function launchBooter(booterBlockName = 'Booter') {
  const allBlocks = await loadAllBlocks();

  const booterBlocks = allBlocks.filter(b => b.path.name === booterBlockName);
  if (booterBlocks.length === 0)
    throw new Error(`Booter block ${booterBlockName} not found. Ensure you have it locally or it is imported.`);

  // Take last because order of imports matter and local blocks always override imported.
  const booterBlock = booterBlocks[booterBlocks.length - 1];
  assert(booterBlock);

  const compiledBooterPath = await compileSfcSource(booterBlock, 'BlockFunction');
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    await require(compiledBooterPath).default(allBlocks, LAUNCHER_UTILS);
  } catch (e) {
    console.error('Booter failed with:', e);
    process.exit(1);
  }
}
