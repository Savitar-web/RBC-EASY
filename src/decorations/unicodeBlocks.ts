import data from './data/unicode-blocks.json';
import {SYMBOLS,type Decoration} from './catalog';
const existing=new Set(SYMBOLS.map(s=>s.id));
const blocks=data as [string,number[]][];
export default blocks.flatMap(([category,points])=>points.filter(n=>!existing.has('symbol-'+n)).map((n):Decoration=>({id:'symbol-'+n,name:category+' · U+'+n.toString(16).toUpperCase(),category:'Unicode · '+category,text:String.fromCodePoint(n)})));
