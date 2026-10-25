import {lazy,Suspense,useEffect,useRef,useState,type ChangeEvent,type RefObject} from 'react';
import type {CatalogTab} from './catalog';
import {styledInput} from './text';
const Dialog=lazy(()=>import('./DecorationDialog'));
type Preferences={enabled:boolean;style:string};
const KEY='rbc-decoration-typing-v1';
function preferences():Preferences{try{const p=JSON.parse(localStorage.getItem(KEY)||'{}');return{enabled:p.enabled===true,style:typeof p.style==='string'?p.style:'script-bold'};}catch{return{enabled:false,style:'script-bold'};}}
export function useDecorations(ref:RefObject<HTMLTextAreaElement|HTMLInputElement|null>,text:string,setText:(text:string)=>void,sheet:string,transform?:(value:string,caret:number)=>{value:string;caret:number}){
 const [tab,setTab]=useState<CatalogTab|null>(null),[base,setBase]=useState(preferences),range=useRef({start:0,end:0}),composing=useRef(false),old=useRef(text),pending=useRef<null|{raw:string;value:string;caret:number}>(null),restore=useRef<null|{start:number;end:number}>(null);old.current=text;
 useEffect(()=>{setTab(null);range.current={start:0,end:0};},[sheet]);
 useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify(base));}catch{/* A disabled storage setting must not prevent writing. */}},[base]);
 const capture=()=>{const el=ref.current;if(el)range.current={start:el.selectionStart||0,end:el.selectionEnd||0};};
 const open=(next:CatalogTab='separators')=>{capture();restore.current={...range.current};setTab(next);};
 const close=()=>{setTab(null);requestAnimationFrame(()=>{const el=ref.current;if(el){el.focus({preventScroll:true});const r=restore.current||range.current;el.setSelectionRange(r.start,r.end);}});};
 const insert=(value:string,caret?:number)=>{const {start,end}=range.current,current=old.current;setText(current.slice(0,start)+value+current.slice(end));restore.current={start:start+(caret??value.length),end:start+(caret??value.length)};close();};
 const applyChange=(event:ChangeEvent<HTMLTextAreaElement|HTMLInputElement>)=>{const el=event.currentTarget,next=el.value,native=event.nativeEvent as InputEvent,type=native.inputType;let result={value:next,caret:el.selectionEnd||0};if(pending.current&&next===pending.current.raw){result=pending.current;pending.current=null;}else if(base.enabled&&!composing.current&&(type==='insertText'||type==='insertReplacementText'))result=styledInput(old.current,next,result.caret,base.style,native.data||undefined);if(transform&&!composing.current&&(type==='insertText'||type==='insertReplacementText'||type==='insertFromPaste'))result=transform(result.value,result.caret);old.current=result.value;setText(result.value);if(result.value!==next)requestAnimationFrame(()=>{if(ref.current===el)el.setSelectionRange(result.caret,result.caret);});};
 const compositionStart=()=>{composing.current=true;pending.current=null;};
 const compositionEnd=(event:React.CompositionEvent<HTMLTextAreaElement|HTMLInputElement>)=>{composing.current=false;if(!event.data)return;const el=event.currentTarget,end=el.selectionEnd||0,start=Math.max(0,end-event.data.length),next=el.value;let result=base.enabled?styledInput(next.slice(0,start)+next.slice(end),next,end,base.style,event.data):{value:next,caret:end};if(transform)result=transform(result.value,result.caret);pending.current={raw:next,...result};old.current=result.value;setText(result.value);requestAnimationFrame(()=>{if(ref.current===el)el.setSelectionRange(result.caret,result.caret);});};
 return{open,capture,base,onChange:applyChange,onCompositionStart:compositionStart,onCompositionEnd:compositionEnd,panel:tab&&<Suspense fallback={<div role="status" className="decor-loading">Abriendo biblioteca…</div>}><Dialog initial={tab} selected={text.slice(range.current.start,range.current.end)} base={base} onBase={setBase} close={close} insert={insert}/></Suspense>};
}
