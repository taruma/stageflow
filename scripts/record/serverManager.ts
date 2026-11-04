/**
 * Vite Dev Server lifecycle manager for headless Playwright testing and recording.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import http from 'node:http';

export interface ServerInstance {
  url: string;
  close: () => Promise<void>;
}

function checkServerAvailable(url: string, timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 304);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

export async function ensureViteServer(port = 5173): Promise<ServerInstance> {
  const url = `http://localhost:${port}`;
  const isRunning = await checkServerAvailable(url);

  if (isRunning) {
    return {
      url,
      close: async () => {},
    };
  }

  // Spawn ephemeral background Vite dev server
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const child: ChildProcess = spawn(
    npxCmd,
    ['vite', '--port', String(port), '--strictPort'],
    {
      stdio: 'ignore',
      detached: false,
    }
  );

  // Poll server readiness for up to 15 seconds
  const startTime = Date.now();
  while (Date.now() - startTime < 15000) {
    await new Promise((r) => setTimeout(r, 400));
    if (await checkServerAvailable(url)) {
      return {
        url,
        close: async () => {
          child.kill();
        },
      };
    }
  }

  child.kill();
  throw new Error(`Timed out waiting for Vite server to start on ${url}`);
}
