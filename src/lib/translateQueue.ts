import { getCachedBatch, setCachedBatch } from './cache';
import { protect, restore } from './text';
import { canJoinContinuation } from './context';
import { kurmanjiHtml } from './kurmanji';
import { transliterateNames } from './names';
import { withRetry, type TranslationProvider } from './provider';
import type { SessionFile, SessionRow } from './session';

export interface QueueOptions {
 provider:TranslationProvider; source:string; glossary:string[]; signal:AbortSignal; batchSize:number; onlyFailed:boolean;
 retranslate?:boolean; context?:boolean; target?:'ckb'|'ku'; arabicNames?:boolean;
 onRow?:(file:number,index:number,row:SessionRow,detected?:string)=>void;
 onRows?:(file:number,updates:{index:number;row:SessionRow;detected?:string}[])=>void;
 onProgress:(completed:number,total:number,file:number)=>void;
}
type Item={indices:number[];html:string;tokens:string[];key:string;boundary?:string};
/** Translate cues without changing timestamps. Only unambiguous adjacent English
 * continuations are sent together; unusable boundaries fall back to single cues. */
export async function translateQueue(files:SessionFile[],options:QueueOptions):Promise<void> {
 const {provider,source,glossary,signal,onRow,onProgress}=options;
 const work=files.map(f=>f.rows.map((row,i)=>({row,i})).filter(({row})=>options.onlyFailed?row.status==='failed':options.retranslate?row.status!=='edited':row.status==='pending'||row.status==='failed').map(x=>x.i));
 const total=work.reduce((n,items)=>n+items.length,0);let completed=0;
 let updates:{index:number;row:SessionRow;detected?:string}[]=[];
 const mark=(index:number,row:SessionRow,detected?:string)=>{updates.push({index,row,detected});completed++;};
 const flush=(file:number)=>{if(!updates.length)return;const batch=updates;updates=[];if(options.onRows)options.onRows(file,batch);else for(const item of batch)onRow?.(file,item.index,item.row,item.detected);onProgress(completed,total,file);};
 for(let file=0;file<files.length;file++){
  const cues=files[file].doc.cues,indices=work[file];
  const make=(indices:number[]):Item=>{
   const boundary=indices.length===2?'RIZHBOUNDARYTOKEN':undefined;
   const input=indices.map(i=>cues[i].text).join(` ${boundary} `);
   const protectedText=protect(input,boundary?[...glossary,boundary]:glossary);
   return {indices,...protectedText,boundary,key:JSON.stringify([provider.name,source,options.target||'ckb',boundary?'context-pair-v1':'single-v1',protectedText.html])};
  };
  const groups:Item[]=[];
  for(let n=0;n<indices.length;n++){
   const i=indices[n],next=indices[n+1];
   if(options.context!==false && next===i+1 && canJoinContinuation(cues[i],cues[next],source,glossary)){groups.push(make([i,next]));n++;}
   else groups.push(make([i]));
  }
  const unpack=(item:Item,output:string):string[]=>{
   const rendered=options.target==='ku'?kurmanjiHtml(output,item.html):((options.arabicNames!==false&&(source==='ar'||source==='auto'))?transliterateNames(output,item.html):output);
   const text=restore(rendered,item.tokens);
   if(!item.boundary)return [text];
   const split=text.split(item.boundary);
   if(split.length!==2||!split[0].trim()||!split[1].trim())throw new Error('سنووری دێڕی وەرگێڕان نادیارە.');
   return split.map(x=>x.trim());
  };
  const accept=(item:Item,texts:string[],detected?:string)=>item.indices.forEach((index,n)=>mark(index,{text:texts[n],status:'done'},detected));
  const failed=(item:Item,e:unknown)=>item.indices.forEach(index=>mark(index,{text:'',status:'failed',error:e instanceof Error?e.message:'هەڵەی وەرگێڕان'}));
  const fallback=async(item:Item)=>{
   for(const index of item.indices){
    if(signal.aborted)return;
    const single=make([index]);
    try{
     const result=await withRetry(()=>provider.translate([single.html],source,signal),signal);
     if(signal.aborted)return;if(result.length!==1)throw new Error('وەڵامی وەرگێڕان تەواو نییە.');
     const texts=unpack(single,result[0].text);accept(single,texts,result[0].detected);flush(file);await setCachedBatch([{key:single.key,value:result[0].text}]);
    }catch(e){if(signal.aborted)return;failed(single,e);flush(file);if(e instanceof Error&&e.name==='ProviderUnavailable')throw e;}
   }
  };
  for(let start=0;start<groups.length;){
   if(signal.aborted)return;
   const batch:Item[]=[];let chars=0;
   while(start<groups.length&&batch.length<options.batchSize){const item=groups[start];const length=item.html.length*3+500;if(batch.length&&chars+length>27000)break;batch.push(item);chars+=length;start++;}
   const cached=await getCachedBatch(batch.map(item=>item.key));const pending:Item[]=[];
   batch.forEach((item,n)=>{if(item.indices.length===1&&!cues[item.indices[0]].text.trim()){accept(item,[cues[item.indices[0]].text]);return;}if(cached[n]!==undefined){try{accept(item,unpack(item,cached[n]!));return;}catch{/* Invalid cache: retry. */}}pending.push(item);});
   flush(file);if(!pending.length)continue;
   let results:Awaited<ReturnType<TranslationProvider['translate']>>;
   try{
    results=await withRetry(()=>provider.translate(pending.map(x=>x.html),source,signal),signal);
    if(signal.aborted)return;if(results.length!==pending.length)throw new Error('وەڵامی وەرگێڕان تەواو نییە.');
   }catch(error){
    if(signal.aborted)return;
    if(error instanceof Error&&error.name==='ProviderUnavailable'){for(const item of pending)failed(item,error);flush(file);throw error;}
    for(const item of pending){if(signal.aborted)return;await fallback(item);}
    continue;
   }
   const cache:{key:string;value:string}[]=[];
   for(let i=0;i<pending.length;i++){const item=pending[i];try{const texts=unpack(item,results[i].text);accept(item,texts,results[i].detected);cache.push({key:item.key,value:results[i].text});}catch{if(item.boundary){flush(file);await fallback(item);}else failed(item,new Error('پاراستنی نیشانەکانی ژێرنووس سەرکەوتوو نەبوو.'));}}
   flush(file);await setCachedBatch(cache);
  }
 }
}
