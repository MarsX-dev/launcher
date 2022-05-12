import chalk from 'chalk';
import { MongoClient } from 'mongodb';
import path from 'path';
import { config } from '../configuration';
import { serializeSfc } from '../utils/sfc';
import { writeFileMakeDir } from '../utils/fileUtils';
import { convertV3ToSfc, V3MongoBlock } from '../utils/v3';

export async function downloadBLocks(): Promise<V3MongoBlock[]> {
  console.log('Connecting to MongoDB...');
  const mongoConn = await new MongoClient(config.mongoConn).connect();
  const db = mongoConn.db(config.mongoDbName);
  const allBlocks: V3MongoBlock[] = await db
    .collection<V3MongoBlock>('blocks')
    .find({
      Type: {
        $ne: 'settings',
      },
    })
    .toArray();
  console.log(`Downloaded ${allBlocks.length} block(s)`);
  return allBlocks;
}

export async function migrate(allBlocks: V3MongoBlock[]) {
  for (const block of allBlocks) {
    const sfcBlock = convertV3ToSfc(block);
    const serialized = serializeSfc(sfcBlock);
    for (const source of serialized) {
      await writeFileMakeDir(path.join(config.blocksDir, source.filePath), source.content);
      console.log(`Saved ${source.filePath}`);
    }
  }

  console.log(chalk.green('\nMigration complete successfully!'));
}

export async function migrateV3ToV4() {
  const allBlocks = await downloadBLocks();
  return migrate(allBlocks);
}
