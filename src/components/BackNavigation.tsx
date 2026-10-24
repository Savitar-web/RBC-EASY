import {useEffect,useRef} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import {isNativeAndroid,nativeShortcuts} from '../pwa/install';
export function parentPage(path:string){
 if(/^\/(perfil|publicacion)\//i.test(path))return '/explorar';
 if(['/modo-ascendido','/conversion','/balistica'].includes(path.toLowerCase()))return '/calcular';
 if(path.toLowerCase()==='/proyectos')return '/';
 return path==='/'?null:'/proyectos';
}
function closeTopDialog(){
 const dialogs=Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')).filter(d=>d.getClientRects().length);
 const dialog=dialogs.at(-1);if(!dialog)return false;
 const close=Array.from(dialog.querySelectorAll<HTMLButtonElement>('button')).find(b=>!b.disabled&&(/cerrar|cancelar/i.test(b.getAttribute('aria-label')||'')||/^[×✕✖]$/.test(b.textContent?.trim()||'')||b.textContent?.trim()==='Cancelar'));
 if(close){close.click();return true;}
 // Installation, saving and other non-dismissible dialogs must not discard work.
 return true;
}
export default function BackNavigation(){const location=useLocation(),navigate=useNavigate(),current=useRef(location),backIndex=useRef(Number(history.state?.idx)||0);
 current.current=location;
 useEffect(()=>{
  if(!isNativeAndroid()&&Number(history.state?.idx||0)===0&&location.pathname!=='/'){
   const state=history.state,chain:string[]=[];let path:string|null=location.pathname;
   while(path!==null){chain.unshift(path);path=parentPage(path);}
   chain.forEach((path,index)=>{const url=index===chain.length-1?location.pathname+location.search+location.hash:path;const next={...state,idx:index};if(index===0)history.replaceState(next,'',url);else history.pushState(next,'',url);});
  }
  backIndex.current=Number(history.state?.idx)||0;
 },[location.key]);
 useEffect(()=>{
  const go=()=>{if(closeTopDialog())return;const parent=parentPage(current.current.pathname);if(parent)navigate(parent,{replace:true});else if(isNativeAndroid())void nativeShortcuts.background();};
  const native=nativeShortcuts;
  const listener=isNativeAndroid()?native.addListener('backButton',go):null;
  const pop=(event:PopStateEvent)=>{const index=Number(event.state?.idx)||0;if(index>=backIndex.current)return;const before=current.current,modal=closeTopDialog(),parent=parentPage(before.pathname);if(!modal&&!parent)return;event.stopImmediatePropagation();if(modal){history.pushState({...event.state,idx:index+1},'',before.pathname+before.search+before.hash);backIndex.current=index+1;}else{backIndex.current=index;navigate(parent!,{replace:true});}};
  // Capture before BrowserRouter consumes the pop, retaining editor autosaves.
  window.addEventListener('popstate',pop,true);window.addEventListener('rbc-back',go);
  return()=>{window.removeEventListener('popstate',pop,true);window.removeEventListener('rbc-back',go);void listener?.then(h=>h.remove());};
 },[navigate]);return null;}
