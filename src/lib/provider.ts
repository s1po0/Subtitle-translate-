import { batchTranslate } from 'google-translate-api-x';
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
export class GoogleFree implements TranslationProvider {
 name='google-free-v2';
 async translate(texts:string[],source:string,signal:AbortSignal):Promise<TranslationResult[]> {
  if(Date.now()<rateLimitedUntil) throw rateLimit(undefined,true);
  // Repeated protected strings can share one request without merging cue positions.
  const unique=[...new Set(texts)];
  const results=await (Capacitor.isNativePlatform() && unique.length>1 ? this.batch(unique,source,signal) : this.individual(unique,source,signal));
  const map=new Map(unique.map((text,i)=>[text,results[i]]));
  return texts.map(text=>map.get(text)!);
 }
 private async batch(texts:string[],source:string,signal:AbortSignal):Promise<TranslationResult[]> {
  try {
   const result=await batchTranslate(texts,{from:source,to:'ckb',forceFrom:true,forceTo:true,rejectOnPartialFail:true,requestFunction:async (url:string,init:RequestInit)=>{
    if(signal.aborted) throw new DOMException('Cancelled','AbortError');
    const response=await CapacitorHttp.post({url,headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},data:String(init.body||''),responseType:'text',connectTimeout:15000,readTimeout:30000});
    if(signal.aborted) throw new DOMException('Cancelled','AbortError');
    if(response.status===429) throw rateLimit(response.headers);
    return {ok:response.status>=200&&response.status<300,statusText:`Google (${response.status})`,text:async()=>typeof response.data==='string'?response.data:JSON.stringify(response.data)};
   }});
   if(!Array.isArray(result)||result.length!==texts.length) throw new Error('وەڵامی دەستەکە تەواو نییە.');
   const output:TranslationResult[]=result.map((item,i)=>{
    if(!item||typeof item.text!=='string'||(texts[i].trim()&&!item.text.trim())) throw new Error('وەڵامی دەستەکە تەواو نییە.');
    // Fail closed if Google drops or changes a formatting placeholder.
    for(const marker of texts[i].match(/ZXQ\d+QXZ/g)||[]) if(!item.text.includes(marker)) throw new Error('پاراستنی نیشانەکان سەرکەوتوو نەبوو.');
    return {text:item.text,detected:item.from?.language?.iso};
   });
   return output;
  } catch(error) {
   if(signal.aborted || (error instanceof Error && error.name==='ProviderUnavailable')) throw error;
   // The unofficial batch protocol may change. Retry independently instead of risking alignment.
   return this.individual(texts,source,signal);
  }
 }
 private async individual(texts:string[],source:string,signal:AbortSignal):Promise<TranslationResult[]> {
  const results:TranslationResult[]=[];
  for(let start=0;start<texts.length;start+=1){
   const chunk=texts.slice(start,start+1);
   results.push(...await Promise.all(chunk.map(async text=>{
   const url=new URL('https://translate.googleapis.com/translate_a/single');
   url.search=new URLSearchParams({client:'gtx',sl:source,tl:'ckb',dt:'t'}).toString();
   let data:unknown;
   try {
    if (signal.aborted) throw new DOMException('Cancelled','AbortError');
    if (Capacitor.isNativePlatform()) {
     // Native HTTP is not subject to WebView CORS. Never send the optional API key here.
     const res=await CapacitorHttp.post({url:url.toString(),headers:{'Content-Type':'application/x-www-form-urlencoded'},data:new URLSearchParams({q:text}).toString(),connectTimeout:15000,readTimeout:20000,responseType:'json'});
     if (signal.aborted) throw new DOMException('Cancelled','AbortError');
     if(res.status===429) throw rateLimit(res.headers);
     if(res.status<200||res.status>=300) throw new Error(`Google (${res.status}): وەرگێڕان سەرنەکەوت.`);
     data=res.data;
    } else {
     const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({q:text}),signal});
     if(res.status===429) throw rateLimit(Object.fromEntries(res.headers.entries()));
     if(!res.ok) throw new Error(`Google (${res.status}): وەرگێڕان سەرنەکەوت.`);
     data=await res.json();
    }
   } catch(error) {
    if(signal.aborted) throw error;
    if(error instanceof Error && (error.name==='ProviderUnavailable' || /^Google \(\d+\)/.test(error.message))) throw error;
    const unavailable=new Error('پەیوەندی بە وەرگێڕی خۆڕایی نەکرا. لەوانەیە Google داواکارییەکەی ڕاگرتبێت؛ دواتر هەوڵبدەرەوە.'); unavailable.name='ProviderUnavailable'; throw unavailable;
   }
   if(!Array.isArray(data)||!Array.isArray(data[0])) throw new Error('وەڵامی Google نادروستە.');
   const translated=(data[0] as unknown[]).map(part=>Array.isArray(part)&&typeof part[0]==='string'?part[0]:'').join('');
   if(text.trim() && !translated.trim()) throw new Error('وەڵامی Google بەتاڵە.');
   return {text:translated,detected:typeof data[2]==='string'?data[2]:undefined};
  })));
  }
  return results;
 }
}
export async function withRetry<T>(fn:()=>Promise<T>,signal:AbortSignal):Promise<T> { let last:unknown; for(let i=0;i<4;i++) {if(signal.aborted) throw new DOMException('Cancelled','AbortError'); try {return await fn();} catch(e) {last=e; if(signal.aborted) throw e; if(i===3 || (e instanceof Error && e.name==='ProviderUnavailable') || (e instanceof Error && /Google \((400|401|403)\)/.test(e.message))) break; await new Promise<void>((resolve,reject)=>{const timer=setTimeout(resolve, 700*2**i+Math.random()*300); signal.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'));},{once:true});});}} throw last; }
