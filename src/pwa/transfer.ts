// Large files use independent byte ranges. Completed segments survive a pause/retry.
const PARTS='rbc-download-parts-v1',CHUNK=4*1024*1024;
export function parallelism(){const n=navigator as Navigator&{connection?:{saveData?:boolean;effectiveType?:string};deviceMemory?:number};return n.connection?.saveData||/^(slow-)?2g$/.test(n.connection?.effectiveType||'')?1:(n.deviceMemory||4)<4?2:/Android|iPhone|iPad/i.test(n.userAgent||'')?3:4;}
const aborted=()=>new DOMException('Descarga pausada','AbortError');
function requestSignal(signal?:AbortSignal){const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;const reset=()=>{clearTimeout(timer);timer=setTimeout(()=>controller.abort(new Error('La conexión no respondió durante 45 segundos')),45000);};const cancel=()=>controller.abort(aborted());if(signal?.aborted)cancel();else signal?.addEventListener('abort',cancel,{once:true});reset();return{signal:controller.signal,reset,close(){clearTimeout(timer);signal?.removeEventListener('abort',cancel);}};}
async function body(response:Response,size:number,progress:(n:number,delta:number)=>void,request:ReturnType<typeof requestSignal>){if(!response.ok||!response.body)throw Error('Servidor HTTP '+response.status);const reader=response.body.getReader(),chunks:BlobPart[]=[];let bytes=0;try{while(true){const part=await reader.read();if(part.done)break;request.reset();bytes+=part.value.byteLength;if(bytes>size)throw Error('Tamaño de archivo inesperado');chunks.push(part.value as BlobPart);progress(bytes,part.value.byteLength);}if(bytes!==size)throw Error('Archivo incompleto ('+bytes+' de '+size+' bytes)');return new Blob(chunks,{type:response.headers.get('content-type')||'application/octet-stream'});}catch(error){await reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}}
export async function download(url:string,size:number,onProgress:(bytes:number,delta:number)=>void,signal?:AbortSignal):Promise<{blob:Blob;cleanup:()=>Promise<void>}>{
 const one=async()=>{const request=requestSignal(signal);try{return{blob:await body(await fetch(url,{signal:request.signal,cache:'default'}),size,onProgress,request),cleanup:async()=>{}};}finally{request.close();}};
 if(size<8*1024*1024)return one();
 const probe=requestSignal(signal);let version='';
 try{const response=await fetch(url+(url.includes('?')?'&':'?')+'rbc_range=probe',{headers:{Range:'bytes=0-0'},signal:probe.signal});const range=response.headers.get('content-range');version=response.headers.get('etag')||'';
 if(response.status!==206||range!=='bytes 0-0/'+size||!version){if(response.status===200)return{blob:await body(response,size,onProgress,probe),cleanup:async()=>{}};await response.body?.cancel();return one();}await response.body?.cancel();
 }catch(error){if(signal?.aborted)throw aborted();return one();}finally{probe.close();}
 const cache=await caches.open(PARTS),key=(start:number,end:number)=>'https://rbc-parts.invalid/'+encodeURIComponent(url)+'?version='+encodeURIComponent(version)+'&range='+start+'-'+end;
 const parts=Array.from({length:Math.ceil(size/CHUNK)},(_,i)=>({start:i*CHUNK,end:Math.min(size-1,(i+1)*CHUNK-1)})),progress=new Map<number,number>(),keys=parts.map(p=>key(p.start,p.end));
 const report=(delta=0)=>onProgress([...progress.values()].reduce((a,b)=>a+b,0),delta);let cursor=0,failure:unknown;
 await Promise.all(Array.from({length:parallelism()},async()=>{while(cursor<parts.length&&!failure){const part=parts[cursor++],length=part.end-part.start+1,k=key(part.start,part.end);try{
  const hit=await cache.match(k);if(hit&&hit.headers.get('x-rbc-size')===String(length)){progress.set(part.start,length);report();continue;}
  for(let attempt=0;attempt<3;attempt++){const request=requestSignal(signal);try{const response=await fetch(url+(url.includes('?')?'&':'?')+'rbc_range='+part.start+'-'+part.end,{headers:{Range:'bytes='+part.start+'-'+part.end},signal:request.signal,cache:attempt?'reload':'default'});
   if(response.status!==206||response.headers.get('content-range')!=='bytes '+part.start+'-'+part.end+'/'+size||response.headers.get('etag')!==version){await response.body?.cancel();throw Error('El servidor cambió la versión o no respetó el segmento solicitado');}
   const blob=await body(response,length,(n,delta)=>{progress.set(part.start,n);report(delta);},request);await cache.put(k,new Response(blob,{headers:{'x-rbc-size':String(length)}}));progress.set(part.start,length);report();break;
  }catch(error){progress.set(part.start,0);report();if(signal?.aborted)throw aborted();if((error as DOMException).name==='QuotaExceededError'||attempt===2)throw error;}finally{request.close();}}
 }catch(error){failure=error;}}}));
 if(signal?.aborted)throw aborted();if(failure)throw failure;
 const blobs:Blob[]=[];for(let i=0;i<parts.length;i++){const hit=await cache.match(keys[i]);if(!hit)throw Error('Un segmento fue eliminado. Reintenta para recuperarlo.');const blob=await hit.blob();if(blob.size!==parts[i].end-parts[i].start+1){await cache.delete(keys[i]);throw Error('Segmento incompleto; reintenta la descarga');}blobs.push(blob);}
 return{blob:new Blob(blobs,{type:'application/octet-stream'}),cleanup:async()=>{for(const k of keys)await cache.delete(k);}};
}
