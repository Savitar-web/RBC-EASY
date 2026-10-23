// Electron uses only built-in Node modules; the frontend dependencies are bundled in dist.
// Stage a minimal app so native builds do not package Capacitor, Vite or build tools.
const fs=require('fs');
const path=require('path');
const {spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..');
const stage=fs.mkdtempSync(path.join(root,'.desktop-build-'));
try {
  for(const folder of ['dist','electron'])fs.cpSync(path.join(root,folder),path.join(stage,folder),{recursive:true});
  const source=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8').replace(/^\uFEFF/,''));
  fs.writeFileSync(path.join(stage,'package.json'),JSON.stringify({name:source.name,productName:'RBC EASY',version:source.version,private:true,main:'electron/main.cjs',description:'Herramientas de escritura y cálculo RBC EASY',author:'Savitar'},null,2));
  const requested=process.argv.slice(2);
  const defaults=process.platform==='win32'?['--win','nsis','portable','--x64']:process.platform==='darwin'?['--mac']:['--linux'];
  const result=spawnSync(process.execPath,[require.resolve('electron-builder/out/cli/cli.js'),...(requested.length?requested:defaults),'--projectDir='+stage,'--config='+path.join(root,'electron-builder.yml'),'--config.directories.output='+path.join(root,'release'),'--config.win.icon='+path.join(root,'public/icons/windows/app-icon.ico'),'--config.directories.app='+stage,'--config.electronVersion='+require('electron/package.json').version,'--config.npmRebuild=false'],{cwd:root,stdio:'inherit'});
  if(result.error)throw result.error;
  process.exitCode=result.status??1;
} finally {
  // Delete only this run's generated staging directory, verified inside this repository.
  const relative=path.relative(root,stage);
  if(!relative.startsWith('.desktop-build-')||relative.includes(path.sep))throw new Error('Ruta de staging no válida');
  fs.rmSync(stage,{recursive:true,force:true});
}
