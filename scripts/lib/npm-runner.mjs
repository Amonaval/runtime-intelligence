import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

function npmCliCandidates() {
  const candidates = [];
  if (process.env.npm_execpath) candidates.push(process.env.npm_execpath);
  candidates.push(path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'));
  return [...new Set(candidates.filter(Boolean))];
}

function quoteCmdArg(value) {
  const text = String(value);
  if (!/[\s&()\[\]{}^=;!'+,`~|<>\"]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Run npm without directly spawning npm.cmd on Windows.
 *
 * Node 22+ on Windows can return spawnSync EINVAL for direct .cmd execution.
 * Prefer npm's JavaScript CLI through the current Node executable; only fall
 * back to cmd.exe when the validator is launched outside npm and npm-cli.js
 * cannot be resolved next to Node.
 */
export function runNpm(args, options = {}) {
  const execOptions = {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  };

  for (const npmCli of npmCliCandidates()) {
    if (existsSync(npmCli)) {
      return execFileSync(process.execPath, [npmCli, ...args], execOptions);
    }
  }

  if (process.platform === 'win32') {
    const shell = process.env.ComSpec || 'cmd.exe';
    const command = ['npm', ...args].map(quoteCmdArg).join(' ');
    return execFileSync(shell, ['/d', '/s', '/c', command], execOptions);
  }

  return execFileSync('npm', args, execOptions);
}
