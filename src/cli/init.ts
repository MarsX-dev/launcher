import chalk from 'chalk';
import { spawnSync } from 'child_process';
import { randomBytes } from 'crypto';
import path from 'path';
import { Configuration } from '../configuration';
import { assert, isDirectory, writeFileMakeDir } from '../utils/utils';
import { CliError } from './index';

const FASTIFY_DEPS = [
  '@fastify/session',
  'fastify',
  'fastify-accepts',
  'fastify-compress',
  'fastify-cookie',
  'fastify-cors',
  'fastify-csrf',
  'fastify-flash',
  'fastify-formbody',
  'fastify-helmet',
  'fastify-multipart',
  'fastify-request-context',
  'fastify-static',
  'fastify-websocket',
];

const COMMON_DEPS = [
  '@marsx-dev/launcher',
  'aws-sdk',
  'axios',
  'azure-storage',
  'base-x',
  'bcrypt',
  'chokidar',
  'lodash',
  'mongodb4@npm:mongodb@4',
  'mongodb3@npm:mongodb@3',
  'typescript',
  'uuid',
  'xxhash',
];

const V3_DEPS = [
  'babel-core',
  'babel-plugin-transform-react-jsx',
  'config',
  'crypto-js',
  'jsonwebtoken',
  'mobile-detect',
  'moment-timezone',
  'route-pattern',
  'route-sort',
];

const DEFAULT_DEPS = [...FASTIFY_DEPS, ...COMMON_DEPS, ...V3_DEPS];

const DEMO_BOOTER = `<json id='metadata'>
{"version": 4, "restartOnChange": true}
</json>


<script id='BlockFunction' lang='tsx'>
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
    dependencies: {},
  };
  const packageJsonStr = JSON.stringify(packageJson, null, 2);
  await writeFileMakeDir(path.join(projectDir, 'package.json'), packageJsonStr);

  const config: Configuration = {
    production: false,
    port: 3000,
    blocksDir: 'blocks',
    cacheDir: '.cache',
    mongoConn: '<CONN_STR>',
    mongoDbName: projectName,
    azureStorageConnection: '<CONN_STR>',
    azureStorageAccountName: projectName,
    azureStorageUrl: `https://${projectName}.blob.core.windows.net`,
    webFilesTable: 'webFiles',
    webRecentFilesTable: 'webRecentFiles',
    webFilesBlob: 'web-files',
    secret: (await randomBytes(48)).toString('hex'),
    importProjects: [
      {
        name: 'mars-ide',
        url: 'https://ide.marscloud.dev',
        api_key: '<API_KEY>',
        git_commit_ish: 'main',
      },
    ],
  };

  await writeFileMakeDir(path.join(projectDir, 'config', 'default.json'), JSON.stringify(config, null, 2));
  await writeFileMakeDir(path.join(projectDir, '.gitignore'), 'node_modules\ndist');

  await writeFileMakeDir(path.join(projectDir, 'blocks', 'Booter.service.vue'), DEMO_BOOTER);

  function run(...args: string[]) {
    const cmd = args[0];
    assert(cmd);
    spawnSync(cmd, args.slice(1), { cwd: projectDir, stdio: 'inherit' });
  }
  console.log('Installing dependencies. This might take a couple of minutes.');
  run('npm', 'i', ...DEFAULT_DEPS);

  run('git', 'init');
  run('git', 'add', '.gitignore');
  run('git', 'add', '-A');
  run('git', 'commit', '-m', 'Initial commit');
  console.log('Initialized git repository and created initial commit.');

  console.log(chalk.yellow(`\nMake sure to update parameters in config/default.json`));

  console.log(`${chalk.green('Success!')} Created ${projectName} at ${projectDir}`);
  console.log(chalk.dim(`\nInside that directory, you can start MarsX with\n\n    cd ${projectName}\n    npm run start\n`));
}
