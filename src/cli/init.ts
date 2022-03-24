import chalk from 'chalk';
import { spawnSync } from 'child_process';
import { randomBytes } from 'crypto';
import path from 'path';
import { Config, CustomEnvironmentVariables } from '../configuration';
import { isDirectory, writeFileMakeDir } from '../utils/fileUtils';
import { assert } from '../utils/textUtils';
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

export async function initProject(projectName: string) {
  if (!projectName.match(/^\w+$/) || projectName !== projectName.toLowerCase()) {
    throw new CliError(
      `Project name "${projectName}" may contain only lower case alphanumeric characters and underscores (eg. my_project_name)`,
    );
  }
  const name = {
    snakeCase: projectName,
    withDashes: projectName.replace('_', '-'),
    noSep: projectName.replace('_', ''),
  };

  const projectDir = path.resolve(projectName);

  if (await isDirectory(projectDir)) {
    throw new CliError(`Project dir "${projectName}" already exist. Delete it or choose a different name.`);
  }

  console.log(`Creating a new MarsX project in ${chalk.green(projectDir)}`);

  const packageJson = {
    name: name.withDashes,
    version: '0.0.0',
    private: true,
    scripts: {
      start: 'marsx start',
    },
    dependencies: {},
  };
  const packageJsonStr = JSON.stringify(packageJson, null, 2);
  await writeFileMakeDir(path.join(projectDir, 'package.json'), packageJsonStr);

  const config: Config = {
    production: false,
    port: 3000,
    blocksDir: 'blocks',
    cacheDir: '.cache',
    mongoConn: '<CONN_STR>',
    mongoDbName: name.withDashes,
    azureStorageConnection: '<CONN_STR>',
    azureStorageAccountName: name.noSep,
    azureStorageUrl: `https://${name.noSep}.blob.core.windows.net`,
    webFilesTable: 'webFiles',
    webRecentFilesTable: 'webRecentFiles',
    webFilesBlob: 'web-files',
    secret: (await randomBytes(32)).toString('hex'),
    importProjects: [
      {
        name: 'marsx-core',
        url: 'https://core.marsx.dev',
        api_key: '<API_KEY>',
        git_commit_ish: 'main',
      },
    ],
  };

  await writeFileMakeDir(path.join(projectDir, 'config', 'default.json'), JSON.stringify(config, null, 2));
  await writeFileMakeDir(
    path.join(projectDir, 'config', 'custom-environment-variables.json'),
    JSON.stringify(CustomEnvironmentVariables, null, 2),
  );
  await writeFileMakeDir(path.join(projectDir, '.gitignore'), 'node_modules\ndist\n.cache\n');

  function run(...args: string[]) {
    const cmd = args[0];
    assert(cmd);
    spawnSync(cmd, args.slice(1), { cwd: projectDir, stdio: 'inherit', shell: true });
  }

  console.log('\nInstalling dependencies. This might take a couple of minutes.');
  run('npm', 'i', ...DEFAULT_DEPS);
  console.log('');

  run('git', 'init', '--initial-branch=main');
  run('git', 'add', '.gitignore');
  run('git', 'add', '-A');
  run('git', 'commit', '-m', 'Initial MarsX commit');

  console.log(`\n${chalk.green('Success!')} Created ${projectName} at ${projectDir}`);

  console.log(`\nNext steps:`);
  console.log(`  - Open new project directory: ${chalk.underline(`cd ${projectName}`)}`);
  console.log(`  - Contact MarsX to get config params and update them: ${chalk.underline('code config/default.json')}`);
  console.log(`  - (optionally) Migrate V3 blocks using: ${chalk.underline('npx marsx migrate')}`);
  console.log(`  - Start local server: ${chalk.underline('npm run start')}`);
}
