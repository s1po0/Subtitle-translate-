export interface TranslationResult { text:string; detected?:string }
export interface TranslationProvider { name:string; translate(texts:string[], source:string, signal:AbortSignal):Promise<TranslationResult[]> }
export class GoogleCloud implements TranslationProvider {
 name='google-cloud'; constructor(private key:string) {}
 async translate(texts:string[], source:string, signal:AbortSignal):Promise<TranslationResult[]> {
  const res=await fetch('https://translation.googleapis.com/language/translate/v2?key='+encodeURIComponent(this.key), {method:'POST',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({q:texts,target:'ckb',format:'html',...(source==='auto'?{}:{source})})});
  const data=await res.json(); if(!res.ok) throw new Error(`Google (${res.status}): ${data.error?.message || 'هەڵەی وەرگێڕان'}`);
  const out=data.data?.translations; if(!Array.isArray(out)||out.length!==texts.length) throw new Error('وەڵامی Google تەواو نییە.');
  return out.map((x:{translatedText:string;detectedSourceLanguage?:string})=>({text:x.translatedText,detected:x.detectedSourceLanguage}));
 }
}
export class GoogleFree implements TranslationProvider {
 name='google-free-v2';
 async translate(texts:string[],source:string,signal:AbortSignal):Promise<TranslationResult[]> {
  return Promise.all(texts.map(async text=>{
   const url=new URL('https://translate.googleapis.com/translate_a/single');
   url.search=new URLSearchParams({client:'gtx',sl:source,tl:'ckb',dt:'t'}).toString();
   let res:Response;
   try { res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({q:text}),signal}); }
   catch(error) {
    if(signal.aborted) throw error;
    const unavailable=new Error('پەیوەندی بە وەرگێڕی خۆڕایی نەکرا. لەوانەیە Google یان وێبگەڕەکەت ڕێگری کردبێت؛ دواتر هەوڵبدەرەوە.'); unavailable.name='ProviderUnavailable'; throw unavailable;
   }
   if(!res.ok) throw new Error(`Google (${res.status}): وەرگێڕان سەرنەکەوت.`);
   const data:unknown=await res.json();
   if(!Array.isArray(data)||!Array.isArray(data[0])) throw new Error('وەڵامی Google نادروستە.');
   const translated=(data[0] as unknown[]).map(part=>Array.isArray(part)&&typeof part[0]==='string'?part[0]:'').join('');
   if(text.trim() && !translated.trim()) throw new Error('وەڵامی Google بەتاڵە.');
   return {text:translated,detected:typeof data[2]==='string'?data[2]:undefined};
  }));
 }
}
export async function withRetry<T>(fn:()=>Promise<T>,signal:AbortSignal):Promise<T> { let last:unknown; for(let i=0;i<4;i++) {if(signal.aborted) throw new DOMException('Cancelled','AbortError'); try {return await fn();} catch(e) {last=e; if(signal.aborted) throw e; if(i===3 || (e instanceof Error && e.name==='ProviderUnavailable') || (e instanceof Error && /Google \((400|401|403)\)/.test(e.message))) break; await new Promise<void>((resolve,reject)=>{const timer=setTimeout(resolve, 700*2**i+Math.random()*300); signal.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'));},{once:true});});}} throw last; }
