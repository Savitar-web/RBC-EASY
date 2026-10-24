export type Asset={url:string;size:number;hash?:string;name?:string};
export type Package={cache:string;entries:Asset[];voices:Asset[];native?:boolean};
export type Progress={done:number;total:number;label:string};
const STATE='rbc-offline-state',MODELS='rbc-neural-models-v1';
const native=!!(window as any).rbcDesktop||(window as any).Capacitor?.isNativePlatform?.()===true;
const stateKey=(key:string)=>native?'https://rbc-internal.invalid/'+key:'/'+key;
const jsonResponse=(data:unknown)=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
export async function installationPackage():Promise<Package>{
 const state=await caches.open(STATE);
 try{const [core,voice]=await Promise.all([fetch('/offline-assets.json',{cache:'no-store'}),fetch('/voice-assets.json',{cache:'no-store'})]);if(!core.ok||!voice.ok)throw Error('No se pudo consultar el paquete de instalación.');const manifest=await core.json(),catalog=await voice.json();if(!manifest.entries?.length||!catalog.files?.length)throw Error('Paquete de instalación no disponible.');const pack={cache:native?'rbc-native-bundle-v1':manifest.cache,entries:native?[]:manifest.entries,voices:catalog.files,native};await state.put(stateKey('package'),jsonResponse(pack));return pack;
 }catch(error){const previous=await state.match(stateKey('package'));if(previous)return previous.json();throw error;}
}
async function valid(cache:Cache,a:Asset){const hit=await cache.match(a.url);return !!hit&&hit.headers.get('x-rbc-size')===String(a.size)&&(!a.hash||hit.headers.get('x-rbc-hash')===a.hash);}
export async function installed(pack:Package){
 const state=await caches.open(STATE),record=await state.match(stateKey('installed'));if(!record)return false;
 const saved=await record.json() as Package;
 if(!(await caches.has(saved.cache)))return false;
 const core=await caches.open(saved.cache),voices=await caches.open(MODELS);
 // Checking headers is cheap: models are not loaded into memory at startup.
 const checks=await Promise.all([...saved.entries.map(a=>valid(core,a)),...pack.voices.map(a=>valid(voices,a))]);return checks.every(Boolean);
}
let active:Promise<void>|undefined;
export function installPackage(pack:Package,onProgress:(p:Progress)=>void,signal?:AbortSignal){
 if(active)return active;
 active=run(pack,onProgress,signal).finally(()=>{active=undefined;});return active;
}
async function run(pack:Package,onProgress:(p:Progress)=>void,signal?:AbortSignal){
 const total=[...pack.entries,...pack.voices].reduce((sum,a)=>sum+a.size,0);let done=0,last=0;
 const report=(label:string,force=false)=>{const now=performance.now();if(force||now-last>100){last=now;onProgress({done,total,label});}};
 const core=await caches.open(pack.cache),voices=await caches.open(MODELS);
 const older=pack.native?[]:(await caches.keys()).filter(k=>k.startsWith('rbc-easy-shell-')&&k!==pack.cache);
 const transfer=async(a:Asset,cache:Cache)=>{
  if(signal?.aborted)throw new DOMException('Descarga pausada','AbortError');if(await valid(cache,a)){done+=a.size;report(a.name||a.url);return;}
  if(a.hash)for(const key of older){const old=await caches.open(key);if(await valid(old,a)){await cache.put(a.url,(await old.match(a.url))!);done+=a.size;report(a.url);return;}}
  const start=done;report(a.name||a.url,true);
  try{
   const response=await fetch(a.url,{signal,cache:'no-store'});if(!response.ok||!response.body)throw Error('No se pudo descargar '+(a.name||a.url));
   let received=0;const headers=new Headers(response.headers);headers.set('x-rbc-size',String(a.size));if(a.hash)headers.set('x-rbc-hash',a.hash);
   const stream=response.body.pipeThrough(new TransformStream<Uint8Array,Uint8Array>({transform(chunk,controller){received+=chunk.byteLength;done+=chunk.byteLength;report(a.name||a.url);controller.enqueue(chunk);},flush(){if(received!==a.size)throw Error('El archivo cambió o está incompleto. Reintenta para actualizar el paquete.');}}));
   await cache.put(a.url,new Response(stream,{status:200,headers}));
  }catch(error){done=start;await cache.delete(a.url);report('Descarga interrumpida',true);throw error;}
 };
 // Sequential streaming bounds memory use even on phones; completed files survive retry.
 for(const a of pack.entries)await transfer(a,core);
 if(!pack.native)await core.put('/__rbc_complete',new Response('ready'));
 for(const a of pack.voices)await transfer(a,voices);
 if(signal?.aborted)throw signal.reason;
 await (await caches.open(STATE)).put(stateKey('installed'),jsonResponse(pack));
 await navigator.storage?.persist?.().catch(()=>false);
 report('Instalación completa',true);
 // Only remove old versions after the entire replacement is durable.
 // Keep recent script bundles for tabs opened before an update, without duplicating media.
 const retained=older.slice(-2);
 for(const name of older){if(!retained.includes(name)){await caches.delete(name);continue;}const previous=await caches.open(name);for(const request of await previous.keys()){const path=new URL(request.url).pathname;if(path!=='/index.html'&&path!=='/__rbc_complete'&&!path.startsWith('/assets/'))await previous.delete(request);}}
}
