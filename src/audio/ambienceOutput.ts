// One output graph per element; iOS ignores HTMLMediaElement.volume but honors GainNode.
export function ambienceOutput(audio:HTMLAudioElement){
 let context:AudioContext|null=null,gain:GainNode|null=null,level=0;
 const volume=(value:number)=>{level=Math.max(0,Math.min(.4,value));if(gain&&context){audio.volume=1;gain.gain.setTargetAtTime(level,context.currentTime,.08);}else audio.volume=level;};
 const unlock=()=>{try{if(!context){const Constructor=window.AudioContext||(window as any).webkitAudioContext;if(Constructor){context=new Constructor();gain=context!.createGain();gain.gain.value=level;context!.createMediaElementSource(audio).connect(gain);gain.connect(context!.destination);audio.volume=1;}}if(context&&context.state!=='running'&&context.state!=='closed')void context.resume().catch(()=>{});}catch{context=null;gain=null;audio.volume=level;}};
 return{volume,unlock,close:()=>{void context?.close().catch(()=>{});}};
}
