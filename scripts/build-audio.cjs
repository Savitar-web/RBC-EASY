const fs=require('fs'),path=require('path'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'..');
esbuild.buildSync({entryPoints:[path.join(__dirname,'tts-worker.entry.cjs')],bundle:true,platform:'browser',format:'iife',outfile:path.join(root,'public/tts/worker.js'),external:['fs','path'],logLevel:'warning'});
fs.copyFileSync(path.join(root,'node_modules/lamejs/lame.min.js'),path.join(root,'public/tts/lame.min.js'));
