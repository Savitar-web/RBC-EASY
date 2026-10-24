import nspell from 'nspell';

export type Issue = { offset: number; length: number; word: string; message: string; suggestions: string[]; kind: 'spelling' | 'grammar' | 'typography' };
export const normalizeWord = (word: string) => word.normalize('NFC').toLocaleLowerCase('es');
const COMMON: Record<string,string[]> = {
  ermozo:['hermoso'], ermoso:['hermoso'], nesesario:['necesario'], desicion:['decisión'],
  atravez:['a través'], exepcion:['excepción'], ocacion:['ocasión'], conosco:['conozco'], desarollo:['desarrollo'], haver:['haber'],
};
let dictionary: Promise<ReturnType<typeof nspell>> | undefined;
async function loadDictionary() {
  dictionary ??= Promise.all(['/dictionaries/es.aff', '/dictionaries/es.dic'].map(async url => {
    const response = await fetch(url);
    if (!response.ok) throw new Error('No se pudo cargar el diccionario español. Conéctate una vez para descargarlo.');
    return response.text();
  })).then(([aff, dic]) => nspell(aff, dic)).catch(error => { dictionary = undefined; throw error; });
  return dictionary;
}
export function protectedText(text: string) {
  return text.replace(/[\p{L}\p{M}]+/gu,word=>/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/u.test(word)?' '.repeat(word.length):word).replace(/```[\s\S]*?```|`[^`\n]*`|data:[^\s]+|https?:\/\/[^\s]+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\[(?:Figura\s+\d+(?:\.\d+)?|[BICUS]+)\]|<[^>\n]+>/gi, value => ' '.repeat(value.length));
}
export async function localReview(text: string, allowed: Set<string>, signal: AbortSignal, editorial = false): Promise<Issue[]> {
  const spell = await loadDictionary();
  const clean = protectedText(text);
  const issues: Issue[] = [];
  const known = new Map<string, string[] | null>();
  let count = 0;
  for (const match of clean.matchAll(/[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu)) {
    signal.throwIfAborted();
    const word = match[0], normalized = normalizeWord(word);
    if (allowed.has(normalized) || word.length < 2 || (editorial ? /^(?:ONU|ADN|ARN|ISBN|PDF|HTML|URL|RBC|IA|CPU|USB)$/.test(word) : /^[A-ZÁÉÍÓÚÜÑ]{2,5}$/.test(word))) continue;
    if (!known.has(normalized)) {
      known.set(normalized, spell.correct(word) || spell.correct(normalized) ? null : [...new Set([...(COMMON[normalized] || []), ...spell.suggest(normalized)])].slice(0, 6));
    }
    const suggestions = known.get(normalized);
    if (suggestions) issues.push({ offset: match.index!, length: word.length, word,
      message: 'Palabra no reconocida en el diccionario español. Comprueba las tildes o añádela si es un nombre propio.', kind: 'spelling',
      suggestions: suggestions.map(s => word === word.toLocaleUpperCase('es') ? s.toLocaleUpperCase('es') : /^[A-ZÁÉÍÓÚÜÑ]/.test(word) ? s[0].toLocaleUpperCase('es') + s.slice(1) : s) });
    if (++count % 60 === 0) await new Promise(resolve => setTimeout(resolve, 0));
  }
  const rule = (regex: RegExp, message: string, replacement: (match: RegExpMatchArray) => string) => {
    for (const m of clean.matchAll(regex)) {
      if(text.slice(m.index!,m.index!+m[0].length)!==m[0])continue;
      issues.push({ offset: m.index!, length: m[0].length, word: text.slice(m.index!, m.index! + m[0].length), message, kind: 'typography', suggestions: [replacement(m)] });
    }
  };
  rule(/(?<![\p{L}\p{M}])([\p{L}\p{M}]+)([ \t]+)\1(?![\p{L}\p{M}])/giu, 'Palabra repetida: comprueba si es intencional.', m => m[1]);
  rule(/[ \t]+([,;:!?])/g, 'Sobra espacio antes del signo de puntuación.', m => m[1]);
  rule(/(\p{L})([,;:!?])(\p{L})/gu, 'Falta un espacio después del signo de puntuación.', m => m[1] + m[2] + ' ' + m[3]);
  if(editorial){
    rule(/([¿¡])[ \t]+(?=\p{L})/gu,'No se deja espacio después del signo de apertura.',m=>m[1]);
    rule(/(\p{L})[ \t]+([.])/gu,'Sobra espacio antes del punto.',m=>m[1]+m[2]);
    rule(/\.{4,}/g,'Los puntos suspensivos se escriben con tres puntos.',()=> '…');
    rule(/(?<=\p{L})([,;])\1+/gu,'Signo de puntuación duplicado.',m=>m[1]);
    rule(/(?<![\p{L}\p{M}])([Dd]e)[ \t]+el(?![\p{L}\p{M}])/gu,'Revisa la contracción «del»; conserva «de El» si forma parte de un título.',m=>m[1][0]==='D'?'Del':'del');
    rule(/(?<![\p{L}\p{M}])([Aa])[ \t]+el(?![\p{L}\p{M}])/gu,'Revisa la contracción «al»; no se aplica al pronombre «él».',m=>m[1]==='A'?'Al':'al');
    rule(/(?<![\p{L}\p{M}])([Ss]in)[ \t]+embargo[ \t]+(?=\p{L})/gu,'Si «sin embargo» funciona como conector, se separa con coma.',m=>m[1]+' embargo, ');
  }
  signal.throwIfAborted();
  return issues.sort((a,b) => a.offset - b.offset || b.length - a.length);
}
export async function onlineReview(text: string, allowed: Set<string>, signal: AbortSignal, progress: (value: string) => void): Promise<Issue[]> {
  // Small UTF-8-safe chunks, serialized below the public API's rate limits.
  const clean = protectedText(text);
  const chunks: { text: string; offset: number }[] = [];
  for (let offset = 0; offset < clean.length;) {
    let end = Math.min(offset + 3500, clean.length);
    if (end < clean.length) { const space = clean.lastIndexOf(' ', end); if (space > offset + 1750) end = space + 1; }
    if (end < clean.length && /[\uD800-\uDBFF]/.test(clean[end - 1])) end--;
    chunks.push({ text: clean.slice(offset, end), offset }); offset = end;
  }
  const issues: Issue[] = [];
  for (let i=0; i<chunks.length; i++) {
    signal.throwIfAborted();
    if (i) await new Promise<void>((resolve,reject) => {
      const abort = () => { clearTimeout(timer); reject(new DOMException('Cancelado','AbortError')); };
      const timer = setTimeout(() => { signal.removeEventListener('abort',abort); resolve(); }, 4500);
      signal.addEventListener('abort',abort,{once:true});
    });
    progress(`Revisión avanzada: bloque ${i+1} de ${chunks.length}`);
    const response = await fetch('https://api.languagetool.org/v2/check', { method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({text:chunks[i].text,language:'es',level:'default'}),
      signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]) });
    if (!response.ok) throw new Error(response.status === 429 ? 'El servicio alcanzó su límite. Espera un minuto o usa la revisión local.' : 'El servicio de revisión no está disponible. Puedes usar la revisión local.');
    const data = await response.json();
    if (!Array.isArray(data.matches)) throw new Error('Respuesta no válida del corrector.');
    for (const match of data.matches) {
      if (!Number.isInteger(match.offset) || !Number.isInteger(match.length) || match.offset < 0 || match.length < 0 || match.offset + match.length > chunks[i].text.length) continue;
      const offset = match.offset + chunks[i].offset, word = text.slice(offset, offset + match.length);
      if (match.length && clean.slice(offset,offset+match.length) !== word) continue;
      const kind = match.rule?.issueType === 'misspelling' ? 'spelling' : 'grammar';
      if (kind === 'spelling' && allowed.has(normalizeWord(word))) continue;
      issues.push({offset,length:match.length,word,kind,message:String(match.message || 'Revisa este fragmento.'),
        suggestions:(match.replacements || []).filter((r: {value:unknown})=>typeof r.value==='string').slice(0,8).map((r:{value:string})=>r.value)});
    }
  }
  return issues.sort((a,b)=>a.offset-b.offset);
}
export function replaceIssue(text: string, issue: Issue, replacement: string, issues: Issue[]) {
  if (text.slice(issue.offset, issue.offset + issue.length) !== issue.word) throw new Error('El texto cambió. Ejecuta la revisión de nuevo.');
  const delta = replacement.length - issue.length;
  return { text: text.slice(0,issue.offset) + replacement + text.slice(issue.offset+issue.length),
    issues: issues.filter(other => other !== issue && !(other.offset === issue.offset && (!issue.length || !other.length)) && (other.offset + other.length <= issue.offset || other.offset >= issue.offset + issue.length))
      .map(other=>other.offset >= issue.offset+issue.length ? {...other,offset:other.offset+delta} : other) };
}
