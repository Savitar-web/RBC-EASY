import {TtsSession} from '@mintplex-labs/piper-tts-web';
self.importScripts('/tts/lame.min.js');
let session;
self.onmessage=async({data})=>{try{
 self.postMessage({stage:session?'Preparando texto':'Cargando motor y voz local'});
 if(!session)session=await TtsSession.create({voiceId:data.voice,wasmPaths:{onnxWasm:'/tts/neural/',piperData:'/tts/neural/piper_phonemize.data',piperWasm:'/tts/neural/piper_phonemize.wasm'},progress:p=>self.postMessage({stage:'Descargando modelo de voz',loaded:p.loaded,total:p.total,progress:Math.round(p.loaded/Math.max(1,p.total)*100)})});
 session.speed=Math.max(.5,Math.min(2,data.speed||1));
 self.postMessage({stage:'Generando voz neural'});
 const wav=await session.predict(data.text),buffer=await wav.arrayBuffer(),view=new DataView(buffer);
 let rate=22050,bits=16,format=1,channels=1,start=44,length=buffer.byteLength-44;
 for(let i=12;i+8<buffer.byteLength;){const name=String.fromCharCode(...new Uint8Array(buffer,i,4)),n=view.getUint32(i+4,true);if(name==='fmt '){format=view.getUint16(i+8,true);channels=view.getUint16(i+10,true);rate=view.getUint32(i+12,true);bits=view.getUint16(i+22,true);}if(name==='data'){start=i+8;length=Math.min(n,buffer.byteLength-start);break;}i+=8+n+(n%2);}
 if(channels!==1||!(bits===16&&format===1||bits===32&&format===3))throw new Error('Formato de audio neural no compatible.');
 const pcm=new Int16Array(length/(bits/8));for(let i=0;i<pcm.length;i++)pcm[i]=bits===16?view.getInt16(start+i*2,true):Math.round(Math.max(-1,Math.min(1,view.getFloat32(start+i*4,true)))*32767);
 if(data.format==='wav'){
  // PCM 16-bit WAV is supported by older Android decoders as well as Safari.
  const output=new ArrayBuffer(44+pcm.length*2),header=new DataView(output),ascii=(offset,value)=>{for(let i=0;i<value.length;i++)header.setUint8(offset+i,value.charCodeAt(i));};
  ascii(0,'RIFF');header.setUint32(4,output.byteLength-8,true);ascii(8,'WAVE');ascii(12,'fmt ');header.setUint32(16,16,true);header.setUint16(20,1,true);header.setUint16(22,1,true);header.setUint32(24,rate,true);header.setUint32(28,rate*2,true);header.setUint16(32,2,true);header.setUint16(34,16,true);ascii(36,'data');header.setUint32(40,pcm.length*2,true);for(let i=0;i<pcm.length;i++)header.setInt16(44+i*2,pcm[i],true);
  self.postMessage({bytes:new Uint8Array(output),duration:pcm.length/rate,mime:'audio/wav'},[output]);return;
 }
 self.postMessage({stage:'Codificando MP3',progress:0});
 const encoder=new self.lamejs.Mp3Encoder(1,rate,rate>=32000?192:160),parts=[];for(let i=0;i<pcm.length;i+=1152){if(i%(1152*40)===0)self.postMessage({stage:'Codificando MP3',progress:Math.round(i/pcm.length*100)});const b=encoder.encodeBuffer(pcm.subarray(i,i+1152));if(b.length)parts.push(new Uint8Array(b));}const tail=encoder.flush();if(tail.length)parts.push(new Uint8Array(tail));const bytes=new Uint8Array(parts.reduce((n,b)=>n+b.length,0));let offset=0;for(const b of parts){bytes.set(b,offset);offset+=b.length;}self.postMessage({bytes,duration:pcm.length/rate,mime:'audio/mpeg'},[bytes.buffer]);
 }catch(e){self.postMessage({error:e?.message||String(e)});}
};
