import {useEffect,useRef,useState} from 'react';
import {FileText,Pencil,Plus,X,Upload,Archive} from 'lucide-react';
import './sheet-dialogs.css';

export function RenameSheetDialog({name,save,close}:{name:string;save:(name:string)=>void;close:()=>void}){
 const [value,setValue]=useState(name);const input=useRef<HTMLInputElement>(null);
 useEffect(()=>{input.current?.focus();input.current?.select();},[]);
 return <div className="sheet-backdrop" onClick={close} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();close();}}}>
  <form className="sheet-dialog sheet-rename" role="dialog" aria-modal="true" aria-labelledby="sheet-rename-title" onClick={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();if(value.trim())save(value.trim());}}>
   <header><div><small>ORGANIZA TU ESCRITURA</small><h3 id="sheet-rename-title">Nombre de la hoja</h3></div><button type="button" aria-label="Cerrar" onClick={close}><X size={18}/></button></header>
   <label>Nombre<input ref={input} value={value} onChange={e=>setValue(e.target.value)} maxLength={160} autoComplete="off" placeholder="Escribe un nombre"/></label>
   <p>El contenido se conserva. Las pestañas mantienen su número de orden.</p>
   <footer><button type="button" onClick={close}>Cancelar</button><button className="sheet-primary" disabled={!value.trim()} type="submit">Guardar nombre</button></footer>
  </form>
 </div>;
}

export function SheetManager({sheets,current,open,rename,create,importSheets,close}:{sheets:{id:string;name:string;content:string;closed?:boolean}[];current:string;open:(id:string)=>void;rename:(id:string)=>void;create:()=>void;importSheets:()=>void;close:()=>void}){
 return <div className="sheet-backdrop" onClick={close} onKeyDown={e=>{if(e.key==='Escape')close();}}><section className="sheet-dialog" role="dialog" aria-modal="true" aria-labelledby="sheet-manager-title" onClick={e=>e.stopPropagation()}>
  <header><div><small>TU ESPACIO DE ESCRITURA</small><h3 id="sheet-manager-title">Hojas <span>{sheets.length}</span></h3></div><button aria-label="Cerrar hojas" onClick={close}><X size={18}/></button></header>
  <p>Cerrar una pestaña conserva su contenido aquí. Abre una hoja o cambia su nombre.</p>
  <div className="sheet-actions"><button className="sheet-primary" onClick={create}><Plus size={17}/>Nueva hoja</button><button onClick={importSheets}><Upload size={17}/>Importar</button></div>
  <div className="sheet-list">{sheets.map((h,i)=><div key={h.id} className={'sheet-entry '+(h.id===current?'is-current':'')}>
   <button className="sheet-open" onClick={()=>open(h.id)} title={'Abrir '+h.name}><span className="sheet-glyph">{h.closed?<Archive size={19}/>:<FileText size={19}/>}</span><span><strong>{h.name}</strong><small>{h.id===current?'Actual':h.closed?'Guardada':'Abierta'} · {(h.content.length).toLocaleString()} caracteres</small></span><span className="sheet-index">{i+1}</span></button>
   <button className="sheet-edit" aria-label={'Cambiar nombre de '+h.name} title="Cambiar nombre" onClick={()=>rename(h.id)}><Pencil size={16}/></button>
  </div>)}</div>
  <footer><small>Guardado automático en este dispositivo</small><button onClick={close}>Listo</button></footer>
 </section></div>;
}
