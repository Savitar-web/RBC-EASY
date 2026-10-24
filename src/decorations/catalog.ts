export type Decoration={id:string;name:string;category:string;text:string;bottom?:string};
const motifs=[['Celestial','✦','✧','⋆'],['Lunar','☾','☽','⋆'],['Romántico','♡','♥','୨୧'],['Botánico','❀','✿','❁'],['Real','♔','♕','⚜'],['Gótico','†','✠','♱'],['Cristal','◇','◆','◈'],['Estelar','☆','★','✩'],['Amino','୨୧','꒰ ꒱','⊹'],['Marino','≈','≋','〰'],['Minimalista','·','•','⋅'],['Astral','☼','☀','✺'],['Flechas','↠','↞','➳'],['Nieve','❅','❆','✻'],['Oriental','「','」','※'],['Musical','♪','♫','♬'],['Filigrana','❦','❧','☙'],['Imperial','⚜','♛','♚'],['Neón','⌁','⌬','⟡'],['Alas','ʚ','ɞ','༄'],['Océano','𓆝','𓆟','𓇼'],['Encantado','❥','ღ','❣'],['Medieval','⚔','⛨','♰'],['Cosmos','✵','✶','✷']];
export const SEPARATORS:Decoration[]=motifs.flatMap(([name,a,b,c],i)=>[
 `──── ${a} ────`,`━━━ ${b} ━━━`,`⋅─── ${a} ${b} ${a} ───⋅`,`╶╴╶╴ ${c} ╶╴╶╴`,`${a} · . · ${b} · . · ${a}`,
 `•────── ${c} ──────•`,`╭──── ${a} ────╮`,`╰──── ${b} ────╯`,`${a} ┈┈┈ ${b} ┈┈┈ ${a}`,`═ ⋆ ═ ${c} ═ ⋆ ═`,
 `︶︶︶ ${a} ︶︶︶`,`⌜ ─── ${b} ─── ⌝`,`╌╌╌ ⋆ ${a} ⋆ ╌╌╌`,`${c} ════ ${b} ════ ${c}`,`-ˋˏ ${a} ━━ ${b} ˎˊ-`,
 `${a} ── · · · ── ${b}`,`┊ ┊ ${c} ┊ ┊`,`⊹ ───── ${a} ───── ⊹`,`༺ ${a} ─── ${b} ༻`,`·: ${c} :· ━━ ·: ${a} :·`,
 `⋆｡°✩ ${a} ── ${b} ✩°｡⋆`, `╭╌ ${a} ╌╮ ⊹ ╭╌ ${b} ╌╮`, `•°• ${c} ───── ${a} •°•`, `⊱ ${a} ═══ ${b} ⊰`, `⋆⁺₊⋆ ${c} ⋆⁺₊⋆`, `⌞ ${a} ╌╌╌╌╌ ${b} ⌝`, `˚ ༘ ${c} ⋆｡˚ ${a}`, `┄┄┄ ${a} ⟡ ${b} ┄┄┄`, `╔═ ${a} ═╡ ${c} ╞═ ${b} ═╗`, `✧･ﾟ ${a} ── ${b} ･ﾟ✧`,
].map((text,j)=>({id:`sep-${i}-${j}`,name:`${name} ${j+1}`,category:name,text})));
export const FRAMES:Decoration[]=motifs.flatMap(([name,a,b,c],i)=>[
 [`╭────── ${a} ──────╮`,`╰────── ${b} ──────╯`],
 [`┏━━━━━━ ${c} ━━━━━━┓`,`┗━━━━━━ ${c} ━━━━━━┛`],
 [`╔══════ ${a} ══════╗`,`╚══════ ${b} ══════╝`],
 [`┌ ─ · ${a} · ─ ┐`,`└ ─ · ${b} · ─ ┘`],
 [`༺━━━━ ${a} ━━━━༻`,`༺━━━━ ${b} ━━━━༻`],
 [`${a} ┈┈┈┈ ${c} ┈┈┈┈ ${a}`,`${b} ┈┈┈┈ ${c} ┈┈┈┈ ${b}`],
 [`˚₊· ͟͟͞͞➳ ${a} ╭────────`, `────────╯ ${b} ·₊˚`],
 [`「 ${a} ──────────`, `────────── ${b} 」`],
 [`╭─❖ ${a} ❖────────`, `────────❖ ${b} ❖─╯`], [`✧･ﾟ ${a} ╔════════╗`, `╚════════╝ ${b} ･ﾟ✧`], [`┍━━ ${c} ━━━━━━━━━┑`, `┕━━━━━━━━━ ${c} ━━┙`], [`⊱⋅ ── ${a} ── ⋅⊰`, `⊱⋅ ── ${b} ── ⋅⊰`], [`╔╌╌╌╌ ${a} ╌╌╌╌╗`, `╚╌╌╌╌ ${b} ╌╌╌╌╝`], [`｡･:*:･ﾟ ${a} ﾟ･:*:･｡`, `｡･:*:･ﾟ ${b} ﾟ･:*:･｡`], [`─── ⋆⋅ ${a} ⋅⋆ ───`, `─── ⋆⋅ ${b} ⋅⋆ ───`], [`┏━ ${a} ━━━━━ ${c} ━┓`, `┗━ ${b} ━━━━━ ${c} ━┛`],
 [`⌜════ ${a} ════⌝`, `⌞════ ${b} ════⌟`], [`╓──── ${c} ────╖`, `╙──── ${c} ────╜`], [`◇━━ ${a} ━━━━━━◇`, `◇━━━━━━ ${b} ━━◇`], [`︵‿︵ ${a} ︵‿︵`, `︶‿︶ ${b} ︶‿︶`],
].map(([text,bottom],j)=>({id:`frame-${i}-${j}`,name:`${name} ${j+1}`,category:name,text,bottom})));
const blocks:[string,number,number][]=[['Flechas',0x2190,0x21ff],['Flechas',0x27f0,0x27ff],['Flechas',0x2900,0x297f],['Flechas',0x1f800,0x1f8ff],['Matemáticas',0x2200,0x22ff],['Matemáticas',0x27c0,0x27ef],['Matemáticas',0x2980,0x2aff],['Geometría',0x25a0,0x25ff],['Ornamentos',0x2700,0x27bf],['Ornamentos',0x2b00,0x2bff],['Marcos y líneas',0x2500,0x259f],['Braille y puntos',0x2800,0x28ff],['Música',0x1d100,0x1d1ff],['Monedas',0x20a0,0x20cf],['Técnicos',0x2300,0x23ff],['Letras griegas',0x370,0x3ff],['Alfabetos decorativos',0x1d400,0x1d7ff],['Letras y números',0x2100,0x218f],['Letras y números',0x2460,0x24ff],['Letras y números',0x1f100,0x1f1ff],['Puntuación',0x2000,0x206f],['Puntuación',0x2e00,0x2e7f],['Orientales',0x3001,0x303f],['Egipcios',0x13000,0x1342f],['Emoji y símbolos',0x2600,0x26ff],['Emoji y símbolos',0x1f300,0x1f64f],['Transporte',0x1f680,0x1f6ff],['Emoji y símbolos',0x1f900,0x1faff]];
export const SYMBOLS:Decoration[]=blocks.flatMap(([category,a,b])=>Array.from({length:b-a+1},(_,i)=>a+i).filter(n=>!/[\p{Cn}\p{C}\p{Z}\p{M}]/u.test(String.fromCodePoint(n))).map(n=>({id:`symbol-${n}`,name:`${category} · U+${n.toString(16).toUpperCase()}`,category,text:String.fromCodePoint(n)})));
const EMOJI=['👩‍💻','👨‍💻','🧑‍🎨','🏳️‍🌈','🏳️‍⚧️','❤️','❤️‍🔥','❤️‍🩹','☁️','☀️','❄️','⭐','✨','🌸','🦋','🕊️','🌹','🎭','⚔️','🛡️','🐈‍⬛','🐕‍🦺','👑','💫','🌌','🪷','🫶','🫧'];
for(const [i,text]of EMOJI.entries())SYMBOLS.push({id:`emoji-${i}`,name:'Emoji compuesto '+(i+1),category:'Emoji compuestos',text});
const originalArt:[string,string,string][]=[
 ['ASCII','Gato curioso',' /\_/\\\n( o.o )\n > ^ <'],['ASCII','Búho nocturno',' ,_,\n(O,O)\n(   )\n-"-"-'],['ASCII','Pez','   /`·.¸\n  /¸...¸`:·\n  `·.¸.·´\n     `·'],
 ['ASCII','Café','   ( (\n    ) )\n .------.\n |      |] \n \\      /\n  `----´'],['ASCII','Espada','     /\\\n     ||\n     ||\n  ===++===\n     ||\n     ()'],
 ['ASCII','Cohete','    /\\\n   /  \\\n  | () |\n  |    |\n /|    |\\\n/_|____|_\\\n   /  \\\n   ^^^^'],['ASCII','Libro abierto','  ____  ____\n /    \\/    \\\n|      |     |\n|      |     |\n|______|_____|'],
 ['ASCII','Montañas','      /\\\n  /\\ /  \\  /\\\n /  /    \\/  \\\n/__/______\\___\\'],['ASCII','Conejo',' (\\_/)\n (o.o)\n (")(")'],['ASCII','Ratón','  ()_()\n ( o.o )\n  > ^ <'],
 ['ASCII','Pájaro','  __\n<(o )___\n ( ._> /\n  `---´'],['ASCII','Mariposa',' .==.   .==.\n \\()8\\ /8()/\n  \\___V___/\n  /___^___\\\n  \\()8/ \\8()/'],
 ['ASCII','Castillo',' []   []   []\n |____|____|\n |  _   _  |\n | |_| |_| |\n |    _    |\n |___| |___|'],['ASCII','Sobre',' .----------.\n |\\        /|\n | \\      / |\n |  \\____/  |\n |__________|'],
 ['Text Art','Gato lunar','  /\_/\\  ☾\n ( ˶ᵔ ᵕ ᵔ˶ )\n  / > ♡ < \\'],['Text Art','Flor','     ✿\n  ❀  │  ❀\n   ╲ │ ╱\n    ╲│╱\n     │\n    ╱ ╲'],
 ['Text Art','Abrazo','ʕっ•ᴥ•ʔっ\n  ♡ para ti ♡'],['Text Art','Noche de estrellas','     ✧         ⋆\n  ⋆       ☾\n      ✦        ✧\n ────────⋆──────'],
 ['Text Art','Corona',' ♔   ♕   ♔\n ╲│╲ │ ╱│╱\n  ═══════'],['Text Art','Pergamino','╭──────────────╮\n│    TU ROL    │\n│              │\n╰──────────────╯'],
 ['Monospace','Terminal','+--------------------+\n| > HOLA, UNIVERSO_   |\n+--------------------+'],['Monospace','Dado',' .-------.\n/   o   /|\n+-------+|\n| o   o ||\n|   o   |/\n+-------+'],
 ['Dot Art','Corazón','⠀⠀⣠⣶⣶⣦⣄⠀⣠⣶⣶⣦⣄\n⠀⣾⣿⣿⣿⣿⣿⣾⣿⣿⣿⣿⣿⣷\n⠀⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿\n⠀⠀⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿⠟\n⠀⠀⠀⠀⠙⠿⣿⣿⣿⣿⠟\n⠀⠀⠀⠀⠀⠀⠈⠛⠋'],
 ['Dot Art','Destello','⠀⠀⠀⠀⢀⣀\n⠀⠀⠀⠀⣾⣿⡄\n⠀⣀⣠⣴⣿⣿⣦⣄⣀\n⠈⠛⠿⣿⣿⣿⣿⠿⠛\n⠀⠀⠀⠘⣿⣿⠃\n⠀⠀⠀⠀⠹⠏'],
];
export const ART:Decoration[]=originalArt.map(([category,name,text],i)=>({id:`art-${i}`,name,category,text:category==='ASCII'?text.replace(/[^\x20-\x7e\n]/g,"'"):text}));
// Original procedural drawings, kept as small recipes rather than downloaded images.
const shapes:[string,(x:number,y:number)=>boolean][]=[['Corazón',(x,y)=>(x*x+y*y-1)**3-x*x*y*y*y<0],['Luna',(x,y)=>x*x+y*y<1&&(x-.4)**2+(y+.15)**2>.8],['Estrella',(x,y)=>Math.hypot(x,y)<.62+.28*Math.cos(5*Math.atan2(y,x))],['Diamante',(x,y)=>Math.abs(x)+Math.abs(y)<1.15],['Planeta',(x,y)=>x*x+y*y<.5||Math.abs(y+.35*x)<.09&&Math.abs(x)<1.1],['Anillo',(x,y)=>x*x+y*y<1&&x*x+y*y>.65],['Mariposa',(x,y)=>((Math.abs(x)-.5)*1.6)**2+(y*1.3)**2<.6],['Flor',(x,y)=>Math.hypot(x,y)<.65+.2*Math.cos(6*Math.atan2(y,x))],['Reloj de arena',(x,y)=>Math.abs(x)<Math.abs(y)*.8&&Math.abs(y)<1],['Árbol',(x,y)=>y>-.7&&Math.abs(x)<(y+.8)*.6||y<-.65&&Math.abs(x)<.13],['Cruz',(x,y)=>Math.abs(x)<.18&&Math.abs(y)<1||Math.abs(y-.3)<.18&&Math.abs(x)<.8],['Onda',(x,y)=>Math.abs(y-Math.sin(x*5)*.5)<.12],['Eclipse',(x,y)=>x*x+y*y<1&&(x+.45)**2+y*y>.85],['Portal',(x,y)=>Math.abs(x)<.7&&Math.abs(y)<1&&(Math.abs(x)>.5||Math.abs(y)>.8)],['Rombo doble',(x,y)=>Math.abs(Math.abs(x)+Math.abs(y)-.8)<.13],['Escudo',(x,y)=>y<.9&&y>Math.abs(x)*1.5-1&&Math.abs(x)<.7]];
for(const [i,[name,fn]]of shapes.entries())for(const [j,[category,ink,blank]]of ([['ASCII','#',' '],['Monospace','@',' '],['Text Art','◆','　'],['Dot Art','⣿','⠀']] as const).entries())for(const size of [15,23,35]){const rows=Array.from({length:Math.round(size*.65)},(_,y)=>Array.from({length:size},(_,x)=>fn((x/(size-1)-.5)*2.5,(.5-y/(Math.round(size*.65)-1))*2.5)?ink:blank).join('').trimEnd());ART.push({id:`shape-${i}-${j}-${size}`,name:`${name} · ${size===15?'compacto':size===23?'detalle':'panorámico'}`,category,text:rows.join('\n')});}
export const CATALOG={separators:SEPARATORS,frames:FRAMES,symbols:SYMBOLS,art:ART};
export type CatalogTab=keyof typeof CATALOG|'text';
export function frameText(top:string,bottom:string,body:string,width=24){const wrap=(s:string)=>s.replace(/─{4,}|━{4,}|═{4,}/g,m=>m[0].repeat(Math.max(4,Math.min(48,width)-8)));return wrap(top)+'\n'+body+'\n'+wrap(bottom);}
