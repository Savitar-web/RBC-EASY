import {download,parallelism} from './transfer';
export type Asset={url:string;size:number;hash?:string;name?:string};
export type Package={cache:string;entries:Asset[];voices:Asset[];native?:boolean};
export type Progress={done:number;total:number;label:string;bytesPerSecond?:number};
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
 const current=await caches.open(pack.cache),currentVoices=await caches.open(MODELS);
 if((await Promise.all([...pack.entries.map(a=>valid(current,a)),...pack.voices.map(a=>valid(currentVoices,a))])).every(Boolean))return true;
 const state=await caches.open(STATE),record=await state.match(stateKey('installed'));if(!record)return false;
 const saved=await record.json() as Package;
 if(!(await caches.has(saved.cache)))return false;
 const core=await caches.open(saved.cache),voices=await caches.open(MODELS);
 // Checking headers is cheap: models are not loaded into memory at startup.
 const checks=await Promise.all([...saved.entries.map(a=>valid(core,a)),...pack.voices.map(a=>valid(voices,a))]);return checks.every(Boolean);
}
export async function savedProgress(pack:Package):Promise<Progress&{assets:Record<string,number>;complete:boolean}>{
 const core=await caches.open(pack.cache),voices=await caches.open(MODELS),parts=await caches.open('rbc-download-parts-v1');
 const old=pack.native?[]:(await caches.keys()).filter(k=>k.startsWith('rbc-easy-shell-')&&k!==pack.cache);
 const keys=await parts.keys();let done=0,complete=true;const assets:Record<string,number>={};
 for(const a of [...pack.entries,...pack.voices]){const cache=pack.voices.includes(a)?voices:core;let found=await valid(cache,a);
  if(!found&&a.hash)for(const name of old){if(await valid(await caches.open(name),a)){found=true;break;}}
  if(found){done+=a.size;assets[a.url]=a.size;continue;}
  complete=false;const versions=new Map<string,number>();for(const key of keys){if(!key.url.startsWith('https://rbc-parts.invalid/'+encodeURIComponent(a.url)+'?'))continue;const u=new URL(key.url),hit=await parts.match(key);const size=Number(hit?.headers.get('x-rbc-size')||0),v=u.searchParams.get('version')||'';versions.set(v,(versions.get(v)||0)+size);}
  assets[a.url]=Math.min(a.size,Math.max(0,...versions.values()));done+=assets[a.url];
 }
 const total=[...pack.entries,...pack.voices].reduce((n,a)=>n+a.size,0);return{done:complete?done:Math.min(done,Math.max(0,total-1)),total,label:'Contenido guardado en este dispositivo',assets,complete};
}
export type InstallResult={complete:boolean;failed:{url:string;name:string;error:string}[]};
let active:Promise<InstallResult>|undefined;
const subscribers=new Set<(p:Progress)=>void>();
export function installPackage(pack:Package,onProgress:(p:Progress)=>void,signal?:AbortSignal){
 subscribers.add(onProgress);
 active??=run(pack,p=>subscribers.forEach(fn=>fn(p)),signal).finally(()=>{active=undefined;});return active.finally(()=>subscribers.delete(onProgress));
}
async function run(pack:Package,onProgress:(p:Progress)=>void,signal?:AbortSignal){
 const assets=[...pack.entries,...pack.voices],total=assets.reduce((sum,a)=>sum+a.size,0),progress=new Map<Asset,number>();let last=0,networkBytes=0;const samples:{time:number;bytes:number}[]=[];
 const baseline=await savedProgress(pack);for(const a of assets)progress.set(a,baseline.assets[a.url]||0);onProgress(baseline);
 const report=(label:string,force=false)=>{const now=performance.now();if(force||now-last>160){last=now;samples.push({time:now,bytes:networkBytes});while(samples.length>2&&samples[0].time<now-4000)samples.shift();const first=samples[0];onProgress({done:Math.max(baseline.done,[...progress.values()].reduce((a,b)=>a+b,0)),total,label,bytesPerSecond:(networkBytes-first.bytes)/Math.max(.25,(now-first.time)/1000)});}};
 const core=await caches.open(pack.cache),voices=await caches.open(MODELS);
 const older=pack.native?[]:(await caches.keys()).filter(k=>k.startsWith('rbc-easy-shell-')&&k!==pack.cache);
 const checkAbort=()=>{if(signal?.aborted)throw new DOMException('Descarga pausada','AbortError');};
 const transfer=async(a:Asset,cache:Cache)=>{
  checkAbort();if(await valid(cache,a)){progress.set(a,a.size);report(a.name||a.url);return;}
  if(a.hash)for(const key of older){const old=await caches.open(key);if(await valid(old,a)){await cache.put(a.url,(await old.match(a.url))!);progress.set(a,a.size);report(a.url);return;}}
  for(let attempt=0;attempt<2;attempt++){
   checkAbort();progress.set(a,0);report((attempt?'Reintentando · ':'')+(a.name||a.url),true);
   try{
    const requestUrl=a.hash?a.url+(a.url.includes('?')?'&':'?')+'rbc_asset='+a.hash:a.url;
    const downloaded=await download(requestUrl,a.size,(n,delta)=>{networkBytes+=delta;progress.set(a,n);report(a.name||a.url);},signal),blob=downloaded.blob;
    if(a.hash){const digest=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()),hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');if(hash!==a.hash)throw Error('El contenido cambió. Cierra y vuelve a abrir la app para actualizar el paquete');}
    const headers=new Headers({'Content-Type':blob.type,'x-rbc-size':String(a.size)});if(a.hash)headers.set('x-rbc-hash',a.hash);
    await cache.put(a.url,new Response(blob,{status:200,headers}));await downloaded.cleanup().catch(()=>{});progress.set(a,a.size);report(a.name||a.url,true);return;
   }catch(error){progress.set(a,0);checkAbort();if((error as DOMException).name==='QuotaExceededError')throw error;if(attempt===1)throw Error('No se pudo instalar '+(a.name||a.url)+': '+(error instanceof Error?error.message:String(error))+'. Lo ya instalado se conserva.');await new Promise(r=>setTimeout(r,500*(attempt+1)));}
  }
 };
 const failed:InstallResult['failed']=[];
 const attempt=async(a:Asset,cache:Cache)=>{try{await transfer(a,cache);}catch(error){if(signal?.aborted)throw error;failed.push({url:a.url,name:a.name||a.url,error:error instanceof Error?error.message:String(error)});report('Omitido · '+(a.name||a.url)+'. Continuando con el siguiente archivo…',true);}};
 // Core assets have bounded concurrency; large models use resumable parallel segments.
 let cursor=0,abortError:unknown;await Promise.all(Array.from({length:Math.min(10,parallelism()+2)},async()=>{while(cursor<pack.entries.length&&!abortError){try{if(signal?.aborted)throw new DOMException('Descarga pausada','AbortError');await attempt(pack.entries[cursor++],core);}catch(error){abortError=error;}}}));if(abortError)throw abortError;
 const coreReady=!failed.length;if(!pack.native&&coreReady)await core.put('/__rbc_complete',new Response('ready'));
 let voiceCursor=0;await Promise.all(Array.from({length:Math.min(2,parallelism())},async()=>{while(voiceCursor<pack.voices.length){if(signal?.aborted)throw new DOMException('Descarga pausada','AbortError');await attempt(pack.voices[voiceCursor++],voices);}}));
 if(signal?.aborted)throw new DOMException('Descarga pausada','AbortError');
 const complete=!failed.length,state=await caches.open(STATE);await state.put(stateKey('pending'),jsonResponse(failed));
 if(complete){await state.put(stateKey('installed'),jsonResponse(pack));try{localStorage.setItem('rbc-install-complete','1');}catch{}}
 await navigator.storage?.persist?.().catch(()=>false);
 report(complete?'Instalación completa':failed.length+' archivos pendientes. El resto ya está disponible.',true);
 if(!complete)return{complete,failed};
 // Only remove old versions after the entire replacement is durable.
 // Keep recent script bundles for tabs opened before an update, without duplicating media.
 const retained=older.slice(-2);
 for(const name of older){if(!retained.includes(name)){await caches.delete(name);continue;}const previous=await caches.open(name);for(const request of await previous.keys()){const path=new URL(request.url).pathname;if(path!=='/index.html'&&path!=='/__rbc_complete'&&!path.startsWith('/assets/'))await previous.delete(request);}}
 return{complete,failed};
}
