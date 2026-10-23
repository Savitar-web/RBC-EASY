import {useEffect,useState,type Dispatch,type SetStateAction} from 'react';
export function useWorkspaceState<T>(key:string, initial:T): [T,Dispatch<SetStateAction<T>>] {
  const [value,setValue]=useState<T>(()=>{
    try {const raw=localStorage.getItem('ascended:'+key);if(raw==null)return initial;const saved=JSON.parse(raw);if(Array.isArray(initial))return Array.isArray(saved)?saved:initial;return typeof saved===typeof initial && saved!==null?saved:initial;}catch{return initial;}
  });
  useEffect(()=>{try{localStorage.setItem('ascended:'+key,JSON.stringify(value));}catch{/* Current session remains usable. */}},[key,value]);
  return [value,setValue];
}
