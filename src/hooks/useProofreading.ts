import { useEffect, useRef, useState } from 'react';
import { localReview, onlineReview, normalizeWord, replaceIssue, type Issue } from '../lib/proofreading/engine';

const KEY = 'palabrasPermitidas';
function readWords(): Record<string,string> {
  try { const value = JSON.parse(localStorage.getItem(KEY) || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch { return {}; }
}
export function useProofreading(text: string, setText: (value:string)=>void, documentId: string | null, selection?: {start:number;end:number} | null, editorial = false) {
  const [open,setOpen] = useState(false), [busy,setBusy] = useState(false);
  const [issues,setIssues] = useState<Issue[]>([]), [index,setIndex] = useState(0);
  const [status,setStatus] = useState(''), [words,setWords] = useState(readWords);
  const operation = useRef<AbortController | null>(null);
  const current = useRef({text,documentId}); current.current = {text,documentId};
  const snapshot = useRef({text,documentId});
  useEffect(()=>{
    if (text !== snapshot.current.text || documentId !== snapshot.current.documentId) {
      operation.current?.abort(); setBusy(false); setIssues([]); setIndex(0);
      if (open) setStatus('El documento cambió. Vuelve a revisarlo para obtener sugerencias actualizadas.');
      snapshot.current = {text,documentId};
    }
  },[text,documentId,open]);
  useEffect(()=>()=>operation.current?.abort(),[]);
  const start = async (mode:'local'|'online'='local', selected=false) => {
    operation.current?.abort();
    const controller = new AbortController(); operation.current = controller;
    const captured = {text,documentId}; snapshot.current = captured;
    setOpen(true);setBusy(true);setIssues([]);setIndex(0);setStatus(mode==='online'?'Conectando con LanguageTool…':'Revisando con el diccionario español local…');
    const dictionary = readWords();setWords(dictionary);
    const allowed = new Set(Object.keys(dictionary).map(normalizeWord));
    const start = selected && selection ? selection.start : 0;
    const end = selected && selection ? selection.end : text.length;
    const source = text.slice(start,end);
    try {
      if (!source.trim()) { setIssues([]);setStatus('No hay texto para revisar.');return; }
      const result = mode==='local' ? await localReview(source,allowed,controller.signal,editorial) : await onlineReview(source,allowed,controller.signal,setStatus);
      if (controller.signal.aborted || current.current.text !== captured.text || current.current.documentId !== captured.documentId) return;
      setIssues(result.map(issue=>({...issue,offset:issue.offset+start})));
      setStatus(`${mode==='local'?'Revisión local: ortografía y tipografía':'Revisión avanzada: ortografía, gramática y estilo'}. ${result.length} observaciones${selected?' en la selección':''}.`);
    } catch(error) {
      if (!controller.signal.aborted) setStatus(error instanceof Error ? error.message : 'No se pudo completar la revisión.');
    } finally { if (operation.current === controller) setBusy(false); }
  };
  const close = () => {operation.current?.abort();setBusy(false);setOpen(false);};
  const apply = (replacement:string, every=false) => {
    if (current.current.text !== snapshot.current.text || current.current.documentId !== snapshot.current.documentId) {setIssues([]);setStatus('El documento cambió. Vuelve a revisarlo.');return;}
    const issue=issues[index];if(!issue)return;
    try {
      let result={text,issues};
      const targets=every ? issues.filter(item=>item.kind==='spelling' && item.word===issue.word && item.suggestions.includes(replacement)).sort((a,b)=>b.offset-a.offset) : [issue];
      // Replacements run backwards; earlier offsets remain stable.
      for(const target of targets) result=replaceIssue(result.text,target,replacement,result.issues);
      snapshot.current={text:result.text,documentId};setText(result.text);setIssues(result.issues);if(editorial)setStatus(result.issues.length?`Corrección aplicada. Quedan ${result.issues.length} observaciones.`:'Revisión completada. No quedan observaciones pendientes.');setIndex(i=>Math.min(i,Math.max(0,result.issues.length-1)));
    }catch(error){setStatus(String(error));setIssues([]);}
  };
  const ignore = (remember=false) => {
    const issue=issues[index];if(!issue)return;
    if (remember && issue.kind==='spelling') {
      const next={...readWords(),[normalizeWord(issue.word)]:'1'};
      try {localStorage.setItem(KEY,JSON.stringify(next));setWords(next);} catch {setStatus('No se pudo guardar el diccionario: almacenamiento lleno.');return;}
      setIssues(issues.filter(item=>item.kind!=='spelling'||normalizeWord(item.word)!==normalizeWord(issue.word)));
      setIndex(0);
    } else {setIssues(issues.filter((_,i)=>i!==index));setIndex(i=>Math.min(i,Math.max(0,issues.length-2)));}
  };
  const ignoreAll=()=>{const issue=issues[index];if(!issue)return;setIssues(list=>list.filter(item=>item.kind!==issue.kind||normalizeWord(item.word)!==normalizeWord(issue.word)));setIndex(0);};
  const forget=(word:string)=>{
    const next={...readWords()};delete next[word];
    try{localStorage.setItem(KEY,JSON.stringify(next));setWords(next);}catch{setStatus('No se pudo actualizar el diccionario.');}
  };
  return {open,busy,issues,index,setIndex,status,words,start,close,apply,ignore,ignoreAll,forget,text,selection};
}
export type ProofreadingSession = ReturnType<typeof useProofreading>;
