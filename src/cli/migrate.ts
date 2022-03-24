import chalk from 'chalk';
import { MongoClient } from 'mongodb';
import path from 'path';
import { config } from '../configuration';
import { serializeSfc } from '../utils/sfc';
import { writeFileMakeDir } from '../utils/fileUtils';
import { convertV3ToSfc, V3MongoBlock } from '../utils/v3';

export async function migrateV3ToV4() {
  console.log('Connecting to MongoDB...');
  const mongoConn = await new MongoClient(config.mongoConn).connect();
  const db = mongoConn.db(config.mongoDbName);
  const allBlocks = await db.collection<V3MongoBlock>('blocks').find().toArray();
  console.log(`Downloaded ${allBlocks.length} block(s)`);

  for (const block of allBlocks) {
    const serialized = serializeSfc(convertV3ToSfc(block));
    await writeFileMakeDir(path.join(config.blocksDir, serialized.filePath), serialized.content);
    console.log(`Saved ${serialized.filePath}`);
  }

  console.log(chalk.green('\nMigration complete successfully!'));
}
