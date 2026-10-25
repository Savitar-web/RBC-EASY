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
      const htmlFile=path.join(root,'index.html');
      const html=fs.readFileSync(htmlFile,'utf8');
      const hashes=Array.from(html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)).filter(m=>m[1].trim()).map(m=>"'sha256-"+crypto.createHash('sha256').update(m[1]).digest('base64')+"'");
      const csp=["default-src 'self'", "script-src 'self' 'wasm-unsafe-eval' "+hashes.join(' '), "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob: https:", "media-src 'self' blob: data:", "font-src 'self' data:", "worker-src 'self' blob:", "frame-src 'self' blob:", "connect-src 'self' blob: data: https://hjoxqzlmrlzwidffvpnt.supabase.co wss://hjoxqzlmrlzwidffvpnt.supabase.co https://huggingface.co https://*.huggingface.co https://*.hf.co https://*.xethub.hf.co", "object-src 'none'", "base-uri 'self'", "form-action 'self'"] .join('; ');
      fs.writeFileSync(htmlFile,html.replace('<head>','<head>\n    <meta http-equiv="Content-Security-Policy" content="'+csp+'" />'));
      const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
        e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
      const files = walk(root).filter(f => !['sw.js', 'offline-assets.json'].includes(path.basename(f)));
      const assets = files.map(f => '/' + path.relative(root, f).split(path.sep).join('/'));
      const entries = files.map((f,i) => ({url:assets[i],size:fs.statSync(f).size,hash:crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')}));
      const revision = crypto.createHash('sha256');
      for (const file of files) revision.update(fs.readFileSync(file));
      const cache = 'rbc-easy-shell-' + revision.digest('hex').slice(0, 16);
      fs.writeFileSync(path.join(root, 'offline-assets.json'), JSON.stringify({ cache, assets, entries }));
      const worker = fs.readFileSync(path.resolve(__dirname, 'public/sw.js'), 'utf8');
      fs.writeFileSync(path.join(root, 'sw.js'), `self.__OFFLINE = ${JSON.stringify({ cache, assets, entries })};\n` + worker);
    },
  }],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    watch: { ignored: ['**/work/**','**/release/**','**/android/**','**/.desktop-build-*/**'] },
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
