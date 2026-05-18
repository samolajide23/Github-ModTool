/**
 * Non-interactive helper: selects "don't ask again" on devvit publish source-upload prompt.
 * Usage: node scripts/publish-public.mjs
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWin = process.platform === 'win32';
const npx = isWin ? 'npx.cmd' : 'npx';

const child = spawn(npx, ['devvit', 'publish', '--public'], {
  cwd: root,
  stdio: ['pipe', 'inherit', 'inherit'],
  shell: isWin,
});

let sent = false;
const sendChoice = () => {
  if (sent) return;
  sent = true;
  // Third option: continue and don't ask again
  child.stdin.write('\x1b[B\x1b[B\r');
};

const timer = setTimeout(sendChoice, 30_000);
child.on('exit', (code) => {
  clearTimeout(timer);
  process.exit(code ?? 1);
});

child.stdin?.on('error', () => {});
