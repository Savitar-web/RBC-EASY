import { useEffect, useState } from 'react';
import type { ProofreadingSession } from '../hooks/useProofreading';

export default function ProofreadingDialog({review,writer=false}:{review:ProofreadingSession;writer?:boolean}) {
  const issue=review.issues[review.index];
  const [replacement,setReplacement]=useState('');
  useEffect(()=>setReplacement(issue?.suggestions[0] ?? issue?.word ?? ''),[issue]);
  useEffect(()=>{if(!review.open)return;const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.stopPropagation();review.close();}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[review.open]);
  if(!review.open)return null;
  return <div className={writer?'w-backdrop':'modal-backdrop'} onClick={review.close}>
    <div className={writer?'w-modal':'modal scroll-thin'} onClick={event=>event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Revisión ortográfica" style={{maxHeight:'85dvh',overflowY:'auto'}}>
      <h3>Revisión ortográfica</h3>
      <p role="status" aria-live="polite" style={{fontSize:12,margin:'10px 0',color:'#aaa'}}>{review.status}</p>
      <button className="full" disabled={review.busy} onClick={()=>review.start()}>Revisar todo sin conexión</button>
      {review.selection && review.selection.end>review.selection.start && <button className="full cancel" disabled={review.busy} onClick={()=>review.start('local',true)}>Revisar selección</button>}
      <button className="full cancel" disabled={review.busy} onClick={()=>review.start('online')}>Revisión avanzada online</button>
      <p style={{fontSize:12,color:'#888',margin:'8px 0'}}>La revisión local mantiene el texto en este dispositivo. La avanzada envía el texto a LanguageTool para comprobar también gramática y estilo.</p>
      {!review.busy && issue && <>
        <p style={{fontSize:12,color:'#aaa'}}>{review.index+1} / {review.issues.length} · {issue.kind==='spelling'?'Ortografía':issue.kind==='grammar'?'Gramática y estilo':'Tipografía'}</p>
        <div className="spell-box">
          <p style={{overflowWrap:'anywhere',fontSize:13,margin:'10px 0'}}>{review.text.slice(Math.max(0,issue.offset-55),issue.offset)}<mark style={{color:'var(--accent)',background:'transparent',fontWeight:700}}>{issue.word || '▏'}</mark>{review.text.slice(issue.offset+issue.length,issue.offset+issue.length+55)}</p>
          <p style={{fontSize:12}}>{issue.message}</p>
          <div className="spell-sugs">{issue.suggestions.map(value=><button key={value} onClick={()=>review.apply(value)}>{value || '(eliminar)'}</button>)}</div>
          <label style={{display:'block',fontSize:12,marginTop:10}}>Corrección manual<input aria-label="Corrección manual" value={replacement} onChange={event=>setReplacement(event.target.value)} /></label>
          <button className="full" onClick={()=>review.apply(replacement)}>Aplicar corrección</button>
          {issue.kind==='spelling' && issue.suggestions.includes(replacement) && <button className="full cancel" onClick={()=>review.apply(replacement,true)}>Corregir todas las apariciones iguales</button>}
        </div>
        <button className="full cancel" onClick={()=>review.ignore()}>Omitir esta observación</button>
        {!writer && <button className="full cancel" onClick={review.ignoreAll}>Omitir todas las apariciones iguales</button>}
        {issue.kind==='spelling' && <button className="full" onClick={()=>review.ignore(true)}>Añadir al diccionario personal</button>}
        <div style={{display:'flex',gap:8}}><button className="full cancel" disabled={review.index===0} onClick={()=>review.setIndex(review.index-1)}>← Anterior</button><button className="full cancel" disabled={review.index>=review.issues.length-1} onClick={()=>review.setIndex(review.index+1)}>Siguiente →</button></div>
      </>}
      {review.busy && <button className="full cancel" onClick={review.close}>Cancelar revisión</button>}
      <details style={{marginTop:12,fontSize:12}}><summary>Diccionario personal ({Object.keys(review.words).length})</summary>{Object.keys(review.words).map(word=><button key={word} className="full cancel" onClick={()=>review.forget(word)}>{word} · Quitar</button>)}</details>
      <button className="full cancel" onClick={review.close}>Cerrar</button>
    </div>
  </div>;
}
