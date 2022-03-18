import chalk from 'chalk';
import { exec } from 'child_process';
import { randomBytes } from 'crypto';
import path from 'path';
import * as util from 'util';
import { Configuration } from '../configuration';
import { isDirectory, writeFileMakeDir } from '../utils/utils';
import { CliError } from './index';

const execAsync = util.promisify(exec);

const DEMO_BOOTER = `<json id="metadata">
{"version": 4, "restartOnChange": true}
</json>


<script id="BlockFunction" lang="tsx">
export default async () => {
    console.log('MarsX loaded!')
};
</script>`;

export async function initProject(projectName: string) {
  if (!projectName.match(/^\w+$/) || projectName !== projectName.toLowerCase()) {
    throw new CliError(
      `Project name "${projectName}" may contain only lower case alphanumeric characters and underscores (eg. my_project_name)`,
    );
  }

  const projectDir = path.resolve(projectName);

  if (await isDirectory(projectDir)) {
    throw new CliError(`Project dir "${projectName}" already exist. Delete it or choose a different name.`);
  }

  console.log(`Creating a new MarsX project in ${chalk.green(projectDir)}`);

  const packageJson = {
    name: projectName,
    version: '0.0.0',
    private: true,
    scripts: {
      start: 'marsx start',
    },
    dependencies: {
      '@marsx/launcher': '^0.0.1',
    },
  };
  const packageJsonStr = JSON.stringify(packageJson, null, 2);
  await writeFileMakeDir(path.join(projectDir, 'package.json'), packageJsonStr);

  const config: Configuration = {
    production: false,
    port: 3000,
    blocksDir: 'blocks',
    cacheDir: '.cache',
    mongoConn: '<YOUR_MONGO_CONN_STR>',
    mongoDbName: projectName,
    azureStorageConnection: '<CONN_STR>',
    azureStorageAccountName: projectName,
    azureStorageUrl: `https://${projectName}.blob.core.windows.net`,
    webFilesTable: 'webFiles',
    webRecentFilesTable: 'webRecentFiles',
    webFilesBlob: 'web-files',
    secret: (await randomBytes(48)).toString('hex'),
    importProjects: [{ name: 'mars-ide', url: 'https://ide.marscloud.dev', api_key: '<API_KEY>', git_commit_ish: 'main' }],
  };

  await writeFileMakeDir(path.join(projectDir, 'config', 'default.json'), JSON.stringify(config, null, 2));

  await writeFileMakeDir(path.join(projectDir, 'blocks', 'Booter.service.vue'), DEMO_BOOTER);

  console.log('Installing dependencies. This might take a couple of minutes.');
  await execAsync('npm install', { cwd: projectDir });

  await execAsync('git init', { cwd: projectDir });
  await execAsync('git add -A', { cwd: projectDir });
  await execAsync('git commit -m "Initial commit"', { cwd: projectDir });
  console.log('Initialized git repository and created initial commit.');

  console.log(chalk.yellow(`\nMake sure to update parameters in config/default.json`));

  console.log(`${chalk.green('Success!')} Created ${projectName} at ${projectDir}`);
  console.log(chalk.dim(`\nInside that directory, you can start MarsX with\n\n    cd ${projectName}\n    npm run start\n`));
}
