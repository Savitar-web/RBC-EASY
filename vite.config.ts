import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

export default defineConfig({
  plugins: [react(), {
    name: 'complete-offline-package',
    closeBundle() {
      const root = path.resolve(__dirname, 'dist');
      const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
        e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
      const files = walk(root).filter(f => !['sw.js', 'offline-assets.json'].includes(path.basename(f)));
      const assets = files.map(f => '/' + path.relative(root, f).split(path.sep).join('/'));
      const revision = crypto.createHash('sha256');
      for (const file of files) revision.update(fs.readFileSync(file));
      const cache = 'rbc-easy-shell-' + revision.digest('hex').slice(0, 16);
      fs.writeFileSync(path.join(root, 'offline-assets.json'), JSON.stringify({ cache, assets }));
      const worker = fs.readFileSync(path.resolve(__dirname, 'public/sw.js'), 'utf8');
      fs.writeFileSync(path.join(root, 'sw.js'), `self.__OFFLINE = ${JSON.stringify({ cache, assets })};\n` + worker);
    },
  }],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: false,
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
  base: '/',
});
