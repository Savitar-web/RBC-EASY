import {useEffect,useState} from 'react';
export type PaperTone='dark'|'light'|'sepia';
const KEY='rbc-paper-tone';
function saved():PaperTone{try{const current=localStorage.getItem(KEY)||localStorage.getItem('writer_paper_tone')||JSON.parse(localStorage.getItem('ascended:biblias-paper')||'"dark"');return ['dark','light','sepia'].includes(current)?current:'dark';}catch{return 'dark';}}
export function usePaperTone():[PaperTone,(tone:PaperTone)=>void]{const [tone,setTone]=useState(saved);useEffect(()=>{const refresh=()=>setTone(saved());window.addEventListener('rbc-paper-change',refresh);window.addEventListener('storage',refresh);return()=>{window.removeEventListener('rbc-paper-change',refresh);window.removeEventListener('storage',refresh);};},[]);return [tone,value=>{try{localStorage.setItem(KEY,value);}catch{}setTone(value);window.dispatchEvent(new Event('rbc-paper-change'));}];}
