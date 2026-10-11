import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';
import {execSync} from 'node:child_process';

// Short commit SHA baked into the client bundle at build time.
// Vercel provides VERCEL_GIT_COMMIT_SHA automatically; local builds fall back to git.
function buildCommitSha(): string {
  const vercelSha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (vercelSha) return vercelSha.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', {encoding: 'utf-8'}).trim() || 'local';
  } catch {
    return 'local';
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_COMMIT_SHA__: JSON.stringify(buildCommitSha()),
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
});
