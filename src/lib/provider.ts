import { Capacitor, CapacitorHttp } from '@capacitor/core';
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
// A 429 is a server-side limit, not a bad cue. Do not fan out or hammer it.
let rateLimitedUntil=0;
function rateLimit(headers?:Record<string,string>, existing=false):Error {
 const value=Object.entries(headers||{}).find(([key])=>key.toLowerCase()==='retry-after')?.[1];
 const seconds=value && /^\d+$/.test(value)?Number(value):value?Math.max(0,(Date.parse(value)-Date.now())/1000):0;
 if(!existing) rateLimitedUntil=Date.now()+Math.max(60000,Number.isFinite(seconds)?seconds*1000:0);
 const error=new Error('Google (429): داواکاری زۆر بووە. چەند خولەکێک چاوەڕێ بکە، پاشان دووبارە هەوڵ بدەرەوە.');
 error.name='ProviderUnavailable';return error;
}
// Public key distributed in Google's website-translation widget; not a user credential.
// This undocumented service can change or impose limits without notice.
const WIDGET_KEY='AIzaSyATBXajvzQLTDHEQbcpq0Ihe0vWDHmO520';
const WIDGET_URL='https://translate-pa.googleapis.com/v1/translateHtml';
export class GoogleFree implements TranslationProvider {
 name='google-free-widget-v1';
 async translate(texts:string[],source:string,signal:AbortSignal):Promise<TranslationResult[]> {
  if(signal.aborted) throw new DOMException('Cancelled','AbortError');
  if(Date.now()<rateLimitedUntil) throw rateLimit(undefined,true);
  const unique=[...new Set(texts.filter(t=>t.trim()))];
  if(!unique.length)return texts.map(text=>({text}));
  const payload=[[unique,source,'ckb'],'te_lib'];
  let data:unknown;
  try {
   if(Capacitor.isNativePlatform()){
    const res=await CapacitorHttp.post({url:WIDGET_URL,headers:{'Content-Type':'application/json+protobuf','X-Goog-API-Key':WIDGET_KEY},data:payload,responseType:'json',connectTimeout:15000,readTimeout:30000});
    if(signal.aborted)throw new DOMException('Cancelled','AbortError');
    if(res.status===429)throw rateLimit(res.headers);
    if(res.status<200||res.status>=300)throw new Error(`Google (${res.status}): وەرگێڕان سەرنەکەوت.`);
    data=res.data;
   } else {
    const res=await fetch(WIDGET_URL,{method:'POST',headers:{'Content-Type':'application/json+protobuf','X-Goog-API-Key':WIDGET_KEY},body:JSON.stringify(payload),signal});
    if(res.status===429)throw rateLimit(Object.fromEntries(res.headers.entries()));
    if(!res.ok)throw new Error(`Google (${res.status}): وەرگێڕان سەرنەکەوت.`);
    data=await res.json();
   }
  } catch(error){
   if(signal.aborted || (error instanceof Error && (error.name==='ProviderUnavailable'||/^Google \(\d+\)/.test(error.message))))throw error;
   const unavailable=new Error('پەیوەندی بە وەرگێڕی Google نەکرا. ئینتەرنێت بپشکنە و دواتر هەوڵ بدەرەوە.');unavailable.name='ProviderUnavailable';throw unavailable;
  }
  if(!Array.isArray(data)||!Array.isArray(data[0])||data[0].length!==unique.length)throw new Error('وەڵامی Google تەواو نییە.');
  const translations=data[0] as unknown[];const languages=Array.isArray(data[1])?data[1] as unknown[]:[];
  const results=new Map<string,TranslationResult>();
  unique.forEach((text,i)=>{
   const translated=translations[i];
   if(typeof translated!=='string'||!translated.trim())throw new Error('وەڵامی Google بەتاڵ یان نادروستە.');
   for(const marker of text.match(/ZXQ\d+QXZ/g)||[])if(!translated.includes(marker))throw new Error('پاراستنی نیشانەکانی ژێرنووس سەرکەوتوو نەبوو.');
   results.set(text,{text:translated,detected:typeof languages[i]==='string'?languages[i] as string:undefined});
  });
  return texts.map(text=>text.trim()?results.get(text)!:{text});
 }
}
export async function withRetry<T>(fn:()=>Promise<T>,signal:AbortSignal):Promise<T> { let last:unknown; for(let i=0;i<4;i++) {if(signal.aborted) throw new DOMException('Cancelled','AbortError'); try {return await fn();} catch(e) {last=e; if(signal.aborted) throw e; if(i===3 || (e instanceof Error && e.name==='ProviderUnavailable') || (e instanceof Error && /Google \((400|401|403)\)/.test(e.message))) break; await new Promise<void>((resolve,reject)=>{const timer=setTimeout(resolve, 700*2**i+Math.random()*300); signal.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'));},{once:true});});}} throw last; }
