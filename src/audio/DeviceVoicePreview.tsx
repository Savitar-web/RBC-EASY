import NativeDeviceVoice from './NativeDeviceVoice';
import TtsHelp from './TtsHelp';
import {androidAudio} from './native';
import {spokenText} from '../decorations/text';
import {useEffect,useMemo,useRef,useState} from 'react';
import ReaderControls from './ReaderControls';
import {audioTime} from './StudioPlayer';
import {readingAudio} from './storage';
export default function DeviceVoicePreview(props:{text:string}){return androidAudio()?<NativeDeviceVoice {...props}/>:<BrowserDeviceVoice {...props}/>;}
function BrowserDeviceVoice({text:inputText}:{text:string}){
 const text=useMemo(()=>spokenText(inputText),[inputText]);
 const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]),[voice,setVoice]=useState(''),[rate,setRate]=useState(1),[playing,setPlaying]=useState(false),[position,setPosition]=useState(0);
 const generation=useRef(0),positionRef=useRef(0);
 const stop=()=>{generation.current++;if(playing)window.speechSynthesis?.cancel();setPlaying(false);readingAudio('device-preview',false);};
 useEffect(()=>{if(!window.speechSynthesis?.getVoices)return;const load=()=>{const list=speechSynthesis.getVoices().sort((a,b)=>Number(/^es/i.test(b.lang))-Number(/^es/i.test(a.lang))||Number(/Microsoft/i.test(b.name))-Number(/Microsoft/i.test(a.name))||Number(b.localService)-Number(a.localService)||a.name.localeCompare(b.name));setVoices(list);setVoice(old=>old&&list.some(v=>v.voiceURI===old)?old:list[0]?.voiceURI||'');};load();speechSynthesis.addEventListener('voiceschanged',load);return()=>speechSynthesis.removeEventListener('voiceschanged',load);},[]);
 useEffect(()=>()=>{generation.current++;window.speechSynthesis?.cancel();readingAudio('device-preview',false);},[]);
 useEffect(()=>{generation.current++;window.speechSynthesis?.cancel();setPlaying(false);setPosition(0);positionRef.current=0;readingAudio('device-preview',false);},[text]);
 const start=(offset=0,nextVoice=voice,nextRate=rate)=>{if(!text.trim()){window.dispatchEvent(new Event('rbc-empty-reading'));return;}if(!window.speechSynthesis?.getVoices)return;const token=++generation.current;window.speechSynthesis?.cancel();offset=Math.max(0,Math.min(text.length-1,offset));while(offset>0&&/\S/.test(text[offset-1]))offset--;setPlaying(true);readingAudio('device-preview',true);
  const speak=(index:number)=>{if(token!==generation.current)return;if(index>=text.length){setPlaying(false);setPosition(text.length);readingAudio('device-preview',false);return;}let end=Math.min(index+220,text.length);if(end<text.length){const cut=Math.max(text.lastIndexOf('. ',end),text.lastIndexOf(' ',end));if(cut>index+60)end=cut+1;}if(end<text.length&&/[\uD800-\uDBFF]/.test(text[end-1]))end--;const utterance=new SpeechSynthesisUtterance(text.slice(index,end));utterance.voice=voices.find(v=>v.voiceURI===nextVoice)||null;utterance.lang=utterance.voice?.lang||'es-ES';utterance.rate=nextRate;positionRef.current=index;setPosition(index);utterance.onboundary=e=>{if(token===generation.current){positionRef.current=index+e.charIndex;setPosition(positionRef.current);}};utterance.onend=()=>speak(end);utterance.onerror=()=>{if(token===generation.current){setPlaying(false);readingAudio('device-preview',false);}};speechSynthesis.speak(utterance);};speak(offset);
 };
 return <section className="studio-section"><h4>Lectura con voces del dispositivo</h4><p>Escucha las voces españolas instaladas, como Microsoft Helena o Laura si tu navegador las ofrece. Esta escucha utiliza el lector del sistema; no genera el archivo MP3.</p>{voices.length?<ReaderControls voices={voices.map(v=>({value:v.voiceURI,label:v.name+' · '+v.lang+(v.localService?' · local':'' )}))} voice={voice} onVoice={v=>{setVoice(v);if(playing)start(positionRef.current,v,rate);}} rate={rate} onRate={v=>{setRate(v);if(playing)start(positionRef.current,voice,v);}} playing={playing} onToggle={()=>playing?stop():start(position>=text.length?0:position)} onClose={stop} progress={text.length?position/text.length*100:0} onSeek={n=>start(Math.floor(text.length*n/100))} time={audioTime(position/14/rate)} remaining={audioTime((text.length-position)/14/rate)}/>:<p>Este entorno no ofrece voces del sistema. Puedes seguir usando las voces neurales locales del reproductor.</p>}<TtsHelp/></section>;
}
