export type LetterStyle={id:string;name:string;upper?:string;lower?:string;digits?:string;mark?:string};
const seq=(start:number,n=26)=>Array.from({length:n},(_,i)=>String.fromCodePoint(start+i)).join('');
export const LETTER_STYLES:LetterStyle[]=[
 {id:'plain',name:'Original'},
 {id:'bold',name:'Serif negrita',upper:seq(0x1d400),lower:seq(0x1d41a),digits:seq(0x1d7ce,10)},
 {id:'italic',name:'Serif cursiva',upper:seq(0x1d434),lower:'𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧'},
 {id:'bold-italic',name:'Cursiva negrita',upper:seq(0x1d468),lower:seq(0x1d482)},
 {id:'script',name:'Caligrafía',upper:'𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵',lower:'𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏'},
 {id:'script-bold',name:'Caligrafía imperial',upper:seq(0x1d4d0),lower:seq(0x1d4ea)},
 {id:'gothic',name:'Gótica',upper:'𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ',lower:seq(0x1d51e)},
 {id:'gothic-bold',name:'Gótica negrita',upper:seq(0x1d56c),lower:seq(0x1d586)},
 {id:'double',name:'Doble trazo',upper:'𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ',lower:seq(0x1d552),digits:seq(0x1d7d8,10)},
 {id:'sans',name:'Sans',upper:seq(0x1d5a0),lower:seq(0x1d5ba),digits:seq(0x1d7e2,10)},
 {id:'sans-bold',name:'Sans negrita',upper:seq(0x1d5d4),lower:seq(0x1d5ee),digits:seq(0x1d7ec,10)},
 {id:'sans-italic',name:'Sans inclinada',upper:seq(0x1d608),lower:seq(0x1d622)},
 {id:'sans-bi',name:'Sans negrita inclinada',upper:seq(0x1d63c),lower:seq(0x1d656)},
 {id:'mono',name:'Monoespaciada Unicode',upper:seq(0x1d670),lower:seq(0x1d68a),digits:seq(0x1d7f6,10)},
 {id:'wide',name:'Vaporwave',upper:seq(0xff21),lower:seq(0xff41),digits:seq(0xff10,10)},
 {id:'circle',name:'Burbujas',upper:seq(0x24b6),lower:seq(0x24d0),digits:'⓪①②③④⑤⑥⑦⑧⑨'},
 {id:'negative-circle',name:'Burbujas oscuras',upper:seq(0x1f150),lower:seq(0x1f150)},
 {id:'square',name:'Cuadrados',upper:seq(0x1f130),lower:seq(0x1f130)},
 {id:'negative-square',name:'Cuadrados oscuros',upper:seq(0x1f170),lower:seq(0x1f170)},
 {id:'small',name:'Versalitas',upper:'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ',lower:'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ'},
 {id:'super',name:'Superíndice',upper:'ᴬᴮᶜᴰᴱᶠᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾᵠᴿˢᵀᵁⱽᵂˣʸᶻ',lower:'ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖᑫʳˢᵗᵘᵛʷˣʸᶻ',digits:'⁰¹²³⁴⁵⁶⁷⁸⁹'},
 {id:'underline',name:'Subrayado',mark:'\u0332'}, {id:'double-line',name:'Doble subrayado',mark:'\u0333'},
 {id:'strike',name:'Tachado fino',mark:'\u0336'}, {id:'slash',name:'Trazo diagonal',mark:'\u0338'},
 {id:'overline',name:'Línea superior',mark:'\u0305'}, {id:'dots',name:'Puntos superiores',mark:'\u0307'},
 {id:'spark',name:'Destellos',mark:'\u0359'}, {id:'wave',name:'Onda superior',mark:'\u0303'},
];
for(const style of LETTER_STYLES.slice(1,21))for(const [id,name,mark]of [['under','subrayada','\u0332'],['double','doble línea','\u0333'],['over','línea superior','\u0305'],['strike','tachada','\u0336']])LETTER_STYLES.push({...style,id:style.id+'-'+id,name:style.name+' · '+name,mark});
const source='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const maps=new Map(LETTER_STYLES.map(s=>[s.id,new Map([...source].map((c,i)=>[c,[...(i<26?s.upper||source.slice(0,26):i<52?s.lower||source.slice(26,52):s.digits||source.slice(52))][i<26?i:i<52?i-26:i-52]]))]));
// Canonical Unicode decomposition retains Spanish accents and ñ as combining marks.
export function stylize(text:string,id:string){const style=LETTER_STYLES.find(s=>s.id===id)||LETTER_STYLES[0],map=maps.get(style.id)!;return [...readableText(text).normalize('NFD')].map(c=>{if(/\p{M}/u.test(c))return c;const next=map.get(c)||c;return next+(style.mark&&/\p{L}|\p{N}/u.test(c)?style.mark:'');}).join('');}
export function styledInput(previous:string,next:string,caret:number,id:string,data?:string){
 let start=0;while(start<previous.length&&start<next.length&&previous[start]===next[start])start++;
 if(start&&/[\uDC00-\uDFFF]/.test(next[start]||''))start--;
 let a=previous.length,b=next.length;while(a>start&&b>start&&previous[a-1]===next[b-1]){a--;b--;}
 if(b<next.length&&/[\uDC00-\uDFFF]/.test(next[b]))b++;
 if(data&&next.slice(caret-data.length,caret)===data){start=caret-data.length;b=caret;}
 const inserted=next.slice(start,b),converted=stylize(inserted,id),value=next.slice(0,start)+converted+next.slice(b);
 return{value,caret:caret>=b?caret+converted.length-inserted.length:start+converted.length};
}

const reverse=new Map<string,string>();for(const style of LETTER_STYLES)for(const [i,c]of [...((style.upper||source.slice(0,26))+(style.lower||source.slice(26,52))+(style.digits||source.slice(52)))].entries())if(c!==source[i])reverse.set(c,source[i]);
export function readableText(text:string){return [...text.normalize('NFKC')].map(c=>reverse.get(c)||c).join('').replace(/[\u0332\u0333\u0336\u0338\u0305\u0359]/g,'');}
export function spokenText(text:string){return readableText(text).replace(/```([\s\S]*?)```/g,(_,body:string)=>{const letters=(body.match(/[\p{L}\p{N}]/gu)||[]).length;return letters>body.trim().length*.4?body:' ';}).replace(/\[(?:[BICUS]+|Figura\s+\d+(?:\.\d+)?)\]/gi,'').replace(/https?:\/\/\S+/g,' ').replace(/[^\p{L}\p{M}\p{N}\s.,;:¿?¡!()«»"'’%+\-]/gu,' ').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();}
