export type Format = 'srt' | 'vtt' | 'ass' | 'ssa';
export interface Cue { index: number; start: string; end: string; text: string; rawTags: string[]; id?: string; settings?: string; assFields?: string[]; }
export interface Subtitle { format: Format; cues: Cue[]; header?: string; assFormat?: string[]; }
const tags = (text: string) => text.match(/<[^>]+>|\{\\[^}]*\}/g) || [];
const timing = /^\s*(\S+)\s*-->\s*(\S+)(.*)$/;
export function parseSubtitle(input: string, format: Format): Subtitle {
 const text = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
 if (format === 'ass' || format === 'ssa') {
  const lines = text.split('\n'); let inEvents = false; let fields: string[] = []; const cues: Cue[] = []; const header: string[] = [];
  for (const line of lines) {
   if (/^\[Events\]/i.test(line)) inEvents = true; else if (/^\[/.test(line)) inEvents = false;
   if (inEvents && /^Format\s*:/i.test(line)) fields = line.slice(line.indexOf(':') + 1).split(',').map(x => x.trim().toLowerCase());
   if (inEvents && /^Dialogue\s*:/i.test(line)) {
    if (!fields.length) fields = ['layer','start','end','style','name','marginl','marginr','marginv','effect','text'];
    const values = line.slice(line.indexOf(':') + 1).trimStart().split(','); const count = fields.length; const parts = values.slice(0, count - 1).concat(values.slice(count - 1).join(','));
    const ti = fields.indexOf('text'), si = fields.indexOf('start'), ei = fields.indexOf('end');
    if (ti < 0 || si < 0 || ei < 0 || parts.length < count) throw new Error('فۆرماتی ڕیزەکانی ASS نادروستە.');
    const content = parts[ti]; cues.push({index:cues.length+1,start:parts[si],end:parts[ei],text:content,rawTags:tags(content),assFields:parts});
   } else header.push(line);
  }
  if (!cues.length) throw new Error('هیچ ڕیزێکی ژێرنووس نەدۆزرایەوە.');
  return {format,cues,header:header.join('\n'),assFormat:fields};
 }
 const blocks = text.split(/\n[ \t]*\n/); const cues: Cue[] = [];
 for (const block of blocks) {
  const lines = block.split('\n'); if (format === 'vtt' && (/^WEBVTT(?:\s|$)/.test(lines[0]) || /^(NOTE(?:\s|$)|STYLE(?:\s|$)|REGION(?:\s|$))/.test(lines[0]))) continue;
  const t = lines.findIndex(line => timing.test(line)); if (t < 0) continue;
  const match = lines[t].match(timing)!; const content = lines.slice(t + 1).join('\n').replace(/\n+$/, '');
  cues.push({index:cues.length+1,start:match[1],end:match[2],text:content,rawTags:tags(content),id:t ? lines.slice(0,t).join('\n') : undefined,settings:match[3]});
 }
 if (!cues.length) throw new Error('هیچ ڕیزێکی ژێرنووس نەدۆزرایەوە؛ دڵنیابە فایلەکە دروستە.');
 return {format,cues};
}
function ms(t:string): number { const p=t.replace(',','.').split(':'); const sec=Number(p.pop()); const min=Number(p.pop()||0); const h=Number(p.pop()||0); return Math.round(((h*60+min)*60+sec)*1000); }
function stamp(t:string, format:Format):string { const n=ms(t); const h=Math.floor(n/3600000), m=Math.floor(n/60000)%60, s=Math.floor(n/1000)%60, frac=n%1000; const pad=(v:number,l=2)=>String(v).padStart(l,'0'); return format==='ass'||format==='ssa' ? `${h}:${pad(m)}:${pad(s)}.${pad(Math.round(frac/10))}` : `${pad(h)}:${pad(m)}:${pad(s)}${format==='srt'?',':'.'}${pad(frac,3)}`; }
export function exportSubtitle(doc:Subtitle, texts:string[], format:Format):string {
 if (format==='ass'||format==='ssa') {
  const same=(doc.format==='ass'||doc.format==='ssa') && doc.assFormat; const fields=doc.assFormat||[];
  const header=same ? (doc.header||'').trimEnd() : '[Script Info]\nScriptType: v4.00+\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Arial,24,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text';
  return header+'\n'+doc.cues.map((c,i)=> { const text=(texts[i]??c.text).replace(/\n/g,'\\N'); if (same && c.assFields) {const a=[...c.assFields]; a[fields.indexOf('text')]=text; return 'Dialogue: '+a.join(',');} return `Dialogue: 0,${stamp(c.start,'ass')},${stamp(c.end,'ass')},Default,,0,0,0,,${text}`; }).join('\n')+'\n';
 }
 return (format==='vtt'?'WEBVTT\n\n':'')+doc.cues.map((c,i)=>{ const start=doc.format===format?c.start:stamp(c.start,format), end=doc.format===format?c.end:stamp(c.end,format); const id=format==='srt'?String(i+1):(doc.format==='vtt'&&c.id?c.id:''); const text=(texts[i]??c.text).replace(/\\[Nn]/g,'\n'); return `${id?id+'\n':''}${start} --> ${end}${format==='vtt'&&doc.format==='vtt'?c.settings||'':''}\n${text}`; }).join('\n\n')+'\n';
}
export function duration(c:Cue):number { return (ms(c.end)-ms(c.start))/1000; }
