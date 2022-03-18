#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import { initProject } from './init';
import { migrateV3ToV4 } from './migrate';
import { start } from './start';

export class CliError extends Error {}

async function main() {
  try {
    const program = new Command();

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const version = require('../../package.json').version;
    program.name('marsx').description('CLI for MarsX launcher').version(version);

    program.command('start', { isDefault: true }).description('Start MarsX server').action(start);
    program
      .command('init <project_name>')
      .description('Initialize a new MarsX project named <project_name> in a directory of the same name')
      .action(initProject);
    program.command('migrate').description('Migrate MarsX V3 project to V4').action(migrateV3ToV4);

    await program.parseAsync();
  } catch (e) {
    if (e instanceof CliError) {
      console.error(chalk.red(e.message));
    } else {
      console.error(chalk.red(e));
    }
    process.exit(1);
  }
}

main();
