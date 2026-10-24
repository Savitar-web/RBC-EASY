import {readableText} from '../decorations/text';
export const NEURAL_VOICES=[{value:'es_ES-davefx-medium',label:'David · España · voz neural'},{value:'es_MX-claude-high',label:'Claude · México · voz neural'},{value:'es_AR-daniela-high',label:'Daniela · Argentina · voz neural'},{value:'es_MX-ald-medium',label:'Ald · México · voz neural'}];
export type VoiceProgress={stage:string;loaded?:number;total?:number;percent?:number};
let worker:Worker|null=null,workerVoice='',queue:Promise<unknown>=Promise.resolve(),active:symbol|null=null;
export function neuralSpeech(inputText:string,voice:string,speed:number,options:{signal?:AbortSignal;format?:'wav'|'mp3';onProgress?:(p:VoiceProgress)=>void}={}){
 const text=readableText(inputText);
 const id=Symbol(),aborted=()=>new DOMException('Preparación cancelada','AbortError');
 options.onProgress?.({stage:'Esperando turno del motor de voz'});
 const task=queue.catch(()=>{}).then(()=>new Promise<{bytes:Uint8Array;duration:number;mime:string}>((resolve,reject)=>{
  if(options.signal?.aborted){reject(aborted());return;}if(!NEURAL_VOICES.some(v=>v.value===voice)){reject(new Error('Voz neural desconocida.'));return;}
  active=id;if(!worker||voice!==workerVoice){worker?.terminate();worker=new Worker('/tts/neural/worker.js');workerVoice=voice;}
  const clean=()=>{clearTimeout(timer);options.signal?.removeEventListener('abort',cancel);if(active===id)active=null;};
  const fail=(error:Error)=>{if(active===id){worker?.terminate();worker=null;}clean();reject(error);};
  const cancel=()=>fail(aborted());const timer=setTimeout(()=>fail(new Error('La voz tardó demasiado. Reintenta o elige una voz más ligera como Ald.')),300000);options.signal?.addEventListener('abort',cancel,{once:true});
  worker.onmessage=({data})=>{if(data.stage||'progress'in data){const p:VoiceProgress={stage:data.stage||'Descargando modelo de voz',loaded:data.loaded,total:data.total,percent:data.progress};options.onProgress?.(p);window.dispatchEvent(new CustomEvent('rbc-neural-stage',{detail:p}));if('progress'in data)window.dispatchEvent(new CustomEvent('rbc-neural-progress',{detail:data.progress}));return;}if(data.error){fail(new Error(data.error));return;}clean();resolve(data);};
  worker.onerror=()=>fail(new Error('No se pudo preparar la voz. Comprueba el espacio disponible y prueba la voz Ald para reducir el uso de memoria.'));
  worker.postMessage({text,voice,speed,format:options.format||'mp3'});
 }));queue=task;return task;
}
