export function rasterArt(rgba:Uint8ClampedArray,width:number,height:number,dots:boolean,invert=false,contrast=1){
 const gray=(x:number,y:number)=>{const i=(y*width+x)*4,a=rgba[i+3]/255,l=(.2126*rgba[i]+.7152*rgba[i+1]+.0722*rgba[i+2])*a+255*(1-a);const v=Math.max(0,Math.min(255,(l-128)*contrast+128));return invert?255-v:v;};
 if(!dots){const ramp='@%#*+=-:. ';return Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>ramp[Math.min(ramp.length-1,Math.floor(gray(x,y)/256*ramp.length))]).join('')).join('\n');}
 const bits=[[0,3],[1,4],[2,5],[6,7]],dither=[[0,4],[6,2],[1,5],[7,3]],rows:string[]=[];
 for(let y=0;y<height;y+=4){let line='';for(let x=0;x<width;x+=2){let mask=0;for(let dy=0;dy<4;dy++)for(let dx=0;dx<2;dx++)if(x+dx<width&&y+dy<height&&gray(x+dx,y+dy)<96+dither[dy][dx]*9)mask|=1<<bits[dy][dx];line+=String.fromCodePoint(0x2800+mask);}rows.push(line);}return rows.join('\n');
}
export function trimArt(text:string){const rows=text.split('\n'),blank=/^[ \u2800]*$/;while(rows.length&&blank.test(rows[0]))rows.shift();while(rows.length&&blank.test(rows.at(-1)!))rows.pop();if(!rows.length)return '';let left=Infinity,right=0;for(const row of rows){const first=row.search(/[^ \u2800]/);if(first>=0){left=Math.min(left,first);right=Math.max(right,row.replace(/[ \u2800]+$/,'').length);}}return rows.map(row=>row.slice(left,right)).join('\n');}
