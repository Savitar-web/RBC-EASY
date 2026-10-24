const {cache:CACHE,assets:PRECACHE,entries:ENTRIES=[]}=self.__OFFLINE||{cache:'rbc-easy-dev',assets:[]};
let job;
async function populate(){
 if(job)return job;
 job=(async()=>{const cache=await caches.open(CACHE);let cursor=0;const saved=[],missing=[];
 await Promise.all(Array.from({length:3},async()=>{while(cursor<PRECACHE.length){const url=PRECACHE[cursor++];if(await cache.match(url)){saved.push(url);continue;}try{let response;const asset=ENTRIES.find(a=>a.url===url);for(const name of (await caches.keys()).filter(k=>k.startsWith('rbc-easy-shell-')&&k!==CACHE)){const hit=await (await caches.open(name)).match(url);if(asset&&hit?.headers.get('x-rbc-hash')===asset.hash){response=hit;break;}}
if(!response){const requestURL=asset?url+(url.includes('?')?'&':'?')+'rbc_asset='+asset.hash:url;
 const fetched=await fetch(new Request(requestURL,{cache:'reload'}));if(!fetched.ok)throw Error('No se pudo descargar '+url);
 const blob=await fetched.blob();if(asset&&blob.size!==asset.size)throw Error('Archivo incompleto: '+url);
 const headers=new Headers({'Content-Type':fetched.headers.get('Content-Type')||'application/octet-stream'});
 if(asset){headers.set('x-rbc-size',String(asset.size));headers.set('x-rbc-hash',asset.hash);}response=new Response(blob,{status:200,headers});}await cache.put(url,response);saved.push(url);}catch{missing.push(url);}}}));
 if(!missing.length)await cache.put('/__rbc_complete',new Response('ready'));
 return{saved,missing};})();
 try{return await job;}finally{job=null;}
}
// Heavy downloads require first-run consent. Subsequent versions update quietly.
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const state=await caches.open('rbc-offline-state');
 if(await state.match('/installed'))await populate();
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{
 if(event.data?.type!=='CACHE_OFFLINE')return;
 event.waitUntil(populate().then(result=>event.ports[0]?.postMessage(result)).catch(error=>event.ports[0]?.postMessage({error:error.message})));
});
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 if(new URL(request.url).searchParams.has('rbc_asset')){event.respondWith(fetch(request));return;}
 event.respondWith((async()=>{
 const cache=await caches.open(CACHE),complete=await cache.match('/__rbc_complete');
 const key=request.mode==='navigate'&&!new URL(request.url).pathname.endsWith('.html')?'/index.html':request;
 if(complete){const hit=await cache.match(key,{ignoreVary:true});if(hit)return hit;}
 if(request.mode!=='navigate'){for(const name of (await caches.keys()).filter(k=>k.startsWith('rbc-easy-shell-')&&k!==CACHE)){const hit=await (await caches.open(name)).match(request,{ignoreVary:true});if(hit)return hit;}}
 try{return await fetch(request);}catch{
  for(const name of (await caches.keys()).filter(k=>k.startsWith('rbc-easy-shell-')&&k!==CACHE)){const old=await caches.open(name);if(!(await old.match('/__rbc_complete'))&&!(await old.match('/index.html')))continue;const hit=await old.match(key,{ignoreVary:true});if(hit)return hit;}
  return new Response('Contenido no disponible sin conexión',{status:503});
 }
 })());
});
