const escape = (s:string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export interface Protected { html:string; tokens:string[] }
export function protect(text:string, glossary:string[]=[]):Protected {
 const escaped=glossary.filter(Boolean).sort((a,b)=>b.length-a.length).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
 const pattern=new RegExp(`<[^>]+>|\\{\\\\[^}]*\\}|\\\\[Nnh]|\\[|\\]|♪|(^|\\n)[ \\t]*[-–—](?=\\s)|${escaped.length?escaped.join('|'):'(?!)'}`,'gim');
 const tokens:string[]=[]; let last=0, html=''; for (const m of text.matchAll(pattern)) { const at=m.index; html+=escape(text.slice(last,at)); const n=tokens.push(m[0])-1; html+=`<span class="notranslate">ZXQ${n}QXZ</span>`; last=at+m[0].length; } html+=escape(text.slice(last)); return {html:html.replace(/\n/g,'<br>'),tokens};
}
export function restore(output:string, tokens:string[]):string {
 // Parse in an inert document: no translated HTML is ever inserted into the UI.
 const doc=new DOMParser().parseFromString(output.replace(/<br\s*\/?\s*>/gi,'\n'), 'text/html'); let text=doc.body.textContent||'';
 const positions:number[]=[];
 for (let i=0;i<tokens.length;i++) {const re=new RegExp(`ZXQ\\s*${i}\\s*QXZ`,'gi');const matches=[...text.matchAll(re)];if(matches.length!==1)throw new Error('پاراستنی نیشانەکانی ژێرنووس سەرکەوتوو نەبوو.');positions[i]=matches[0].index!;}
 const stack:number[]=[];
 for(let i=0;i<tokens.length;i++){if(tokens[i]==='[')stack.push(i);else if(tokens[i]===']'&&stack.length){const open=stack.pop()!;if(positions[open]>positions[i])throw new Error('ڕیزبەندی کەوانەکان لە وەرگێڕاندا تێکچووە.');}}
 for (let i=0;i<tokens.length;i++) {const re=new RegExp(`ZXQ\\s*${i}\\s*QXZ`,'gi');text=text.replace(re,()=>tokens[i]);}
 return text;
}
export function rtlPreference(saved:{rtl?:unknown;rtlFixVersion?:unknown}):boolean {return saved.rtlFixVersion===1&&typeof saved.rtl==='boolean'?saved.rtl:true;}
export interface TextOptions { digits:boolean; rtl:boolean; wrap:boolean; replacements:string }
export function normalize(text:string, options:TextOptions):string {
 let s=text.replace(/[يى]/g,'ی').replace(/ك/g,'ک');
 for (const line of options.replacements.split('\n')) {const at=line.indexOf('='); if(at>0) s=s.split(line.slice(0,at).trim()).join(line.slice(at+1).trim());}
 if(options.digits) s=s.replace(/[0-9]/g,c=>'٠١٢٣٤٥٦٧٨٩'[Number(c)]);
 if(options.wrap && !/<[^>]+>|\{\\/.test(s)) { const words=s.replace(/\\N|\n/g,' ').split(/\s+/); let first='',second=''; for(const w of words) {if(!second && (first+' '+w).trim().length<=42) first=(first+' '+w).trim(); else second=(second+' '+w).trim();} s=first+(second?'\n'+second:''); }
 if(options.rtl) s=markRtlLines(s); return s;
}

/** Directional hints are added only to exported translated text, never by reversing characters.
 * A bounded RTL embedding also fixes neutral punctuation when a player uses LTR paragraph direction.
 * ASS override blocks must remain first, and ASS \N/\n line breaks must remain intact. */
export function markRtlLines(text:string):string {
 const RLE='\u202B',RLM='\u200F',PDF='\u202C';
 return text.split(/(\r\n|\n|\\[Nn])/).map((line,index)=>{
  if(index%2===1||!line.trim())return line;
  const prefix=line.match(/^(?:\{\\[^}]*\})*/)?.[0]||'';
  const content=line.slice(prefix.length);
  if(!content.trim()||(content.startsWith(RLE)&&content.endsWith(PDF)))return line;
  return prefix+RLE+RLM+content+RLM+PDF;
 }).join('');
}
