import data from './data/large-art.json';
import supplied from './data/supplied-art.json';
import type {Decoration} from './catalog';
export default [...data.map(([category,name,text],i):Decoration=>({id:'licensed-'+i,category,name,text})),...supplied.map(([category,name,text],i):Decoration=>({id:'supplied-'+i,category,name,text}))];
