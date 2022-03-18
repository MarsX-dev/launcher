import child_process from 'child_process';
import { config } from '../configuration';
import { launchBooter } from '../launcher';
import { assert } from '../utils/utils';

export const RESTART_EXIT_CODe = 9;

export const start = async () => {
  if (config.production || process.env['MARSX_NO_SPAWN']) {
    console.log(`MarsX process ${process.pid} starting...`);
    await launchBooter();
    console.log(`MarsX process ${process.pid} started`);
  } else {
    const spawnChildProc = () => {
      assert(process.argv[0]);
      const child = child_process.spawn(process.argv[0], ['--inspect', '--enable-source-maps', ...process.argv.slice(1)], {
        cwd: process.cwd(),
        env: { ...process.env, MARSX_NO_SPAWN: 'true' },
        stdio: 'inherit',
      });

      child.on('close', (code: number) => {
        console.log(`MarsX process ${child.pid} terminated with ${code}`);
        if (code === RESTART_EXIT_CODe) {
          setTimeout(spawnChildProc, 100);
        } else {
          process.exit(code);
        }
      });
    };

    spawnChildProc();
  }
};
