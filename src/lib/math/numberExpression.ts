// Numeric-only parser: identifiers can only call explicitly supplied math functions.
export function numberExpression(source:string,functions:Record<string,(...args:number[])=>number>){
 if(source.length>20000)throw Error('Expresión demasiado larga');let pos=0,depth=0,steps=0;
 const space=()=>{while(/\s/.test(source[pos]||'')&&pos<source.length)pos++;if(++steps>50000)throw Error('Expresión demasiado compleja');};
 const take=(text:string)=>{space();if(source.slice(pos,pos+text.length)===text){pos+=text.length;return true;}return false;};
 const expression=():number=>{let value=term();while(true){if(take('+'))value+=term();else if(take('-'))value-=term();else return value;}};
 const term=():number=>{let value=unary();while(true){space();if(source.slice(pos,pos+2)==='**')return value;if(take('*'))value*=unary();else if(take('/'))value/=unary();else if(take('%'))value%=unary();else return value;}};
 const unary=():number=>{if(++depth>128)throw Error('Demasiados niveles en la expresión');try{if(take('+'))return unary();if(take('-'))return -unary();return power();}finally{depth--;}};
 const power=():number=>{const value=atom();return take('**')?value**unary():value;};
 const atom=():number=>{space();if(take('(')){const value=expression();if(!take(')'))throw Error('Falta un paréntesis');return value;}
 const number=/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(source.slice(pos));if(number){pos+=number[0].length;return Number(number[0]);}
 const name=/^[A-Za-z_][A-Za-z_0-9]*/.exec(source.slice(pos));if(!name)throw Error('Expresión no válida');pos+=name[0].length;
 if(!Object.prototype.hasOwnProperty.call(functions,name[0])||!take('('))throw Error('Función no permitida: '+name[0]);const args:number[]=[];if(!take(')')){do{if(args.length>=8)throw Error('Demasiados argumentos');args.push(expression());}while(take(','));if(!take(')'))throw Error('Falta un paréntesis');}return functions[name[0]](...args);
 };
 const result=expression();space();if(pos!==source.length||!Number.isFinite(result))throw Error('Resultado no numérico');return result;
}
