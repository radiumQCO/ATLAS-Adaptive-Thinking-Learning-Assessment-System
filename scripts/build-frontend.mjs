import { spawnSync } from 'node:child_process';

for (const file of ['node_modules/typescript/bin/tsc', 'node_modules/vite/bin/vite.js']) {
  const args = file.includes('typescript') ? ['-b'] : ['build', '--configLoader', 'runner'];
  const result = spawnSync(process.execPath, [file, ...args], { stdio: 'inherit', shell: false });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
