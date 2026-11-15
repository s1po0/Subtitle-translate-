import { getCachedBatch, setCachedBatch } from './cache';
import { protect, restore } from './text';
import { withRetry, type TranslationProvider } from './provider';
import type { SessionFile, SessionRow } from './session';

export interface QueueOptions {
 provider:TranslationProvider; source:string; glossary:string[]; signal:AbortSignal; batchSize:number; onlyFailed:boolean;
 onRow?:(file:number,index:number,row:SessionRow,detected?:string)=>void;
 onRows?:(file:number,updates:{index:number;row:SessionRow;detected?:string}[])=>void;
 onProgress:(completed:number,total:number,file:number)=>void;
}
/** Translate separate cue strings; the queue never sends or changes timing. */
export async function translateQueue(files:SessionFile[], options:QueueOptions):Promise<void> {
 const {provider,source,glossary,signal,onRow,onProgress}=options;
 const work=files.map(f=>f.rows.map((row,i)=>({row,i})).filter(({row})=>options.onlyFailed?row.status==='failed':row.status==='pending'||row.status==='failed').map(x=>x.i));
 const total=work.reduce((n,items)=>n+items.length,0);let completed=0;
 let updates:{index:number;row:SessionRow;detected?:string}[]=[];
 const mark=(_file:number,index:number,row:SessionRow,detected?:string)=>{updates.push({index,row,detected});completed++;};
 const flush=(file:number)=>{if(!updates.length)return;const batch=updates;updates=[];if(options.onRows)options.onRows(file,batch);else for(const item of batch)onRow?.(file,item.index,item.row,item.detected);onProgress(completed,total,file);};
 for(let file=0;file<files.length;file++){
  const cues=files[file].doc.cues; const indices=work[file];
  for(let start=0;start<indices.length;){
   if(signal.aborted)return;
   const batch:number[]=[];let chars=0;
   while(start<indices.length && batch.length<options.batchSize){const i=indices[start];const length=cues[i].text.length*3+500;if(batch.length && chars+length>27000)break;batch.push(i);chars+=length;start++;}
   const items=batch.map(i=>{const protectedText=protect(cues[i].text,glossary);const key=JSON.stringify([provider.name,source,'ckb',protectedText.html]);return {i,...protectedText,key};});
   const cached=await getCachedBatch(items.map(item=>item.key));
   const prepared=items.map((item,i)=>({...item,cached:cached[i]}));
   const pending:typeof prepared=[];
   for(const item of prepared){
    if(!cues[item.i].text.trim()){mark(file,item.i,{text:cues[item.i].text,status:'done'});continue;}
    if(item.cached!==undefined){try{mark(file,item.i,{text:restore(item.cached,item.tokens),status:'done'});continue;}catch{/* Invalid cached markers: retry. */}}
    pending.push(item);
   }
   const apply=async(items:typeof pending)=>{
    const results=await withRetry(()=>provider.translate(items.map(x=>x.html),source,signal),signal);
    if(signal.aborted)return;
    if(results.length!==items.length)throw new Error('وەڵامی وەرگێڕان تەواو نییە.');
    const toCache:{key:string;value:string}[]=[];
    items.forEach((item,n)=>{
     try{const text=restore(results[n].text,item.tokens);toCache.push({key:item.key,value:results[n].text});mark(file,item.i,{text,status:'done'},results[n].detected);}
     catch(e){mark(file,item.i,{text:'',status:'failed',error:e instanceof Error?e.message:'هەڵەی وەرگێڕان'});}
    });
    flush(file);await setCachedBatch(toCache);
   };
   flush(file);
   if(!pending.length)continue;
   try{await apply(pending);}catch(error){
    if(signal.aborted)return;
    if(error instanceof Error && error.name==='ProviderUnavailable'){
     for(const item of pending)mark(file,item.i,{text:'',status:'failed',error:error.message});
     flush(file);throw error;
    }
    for(const item of pending){if(signal.aborted)return;try{await apply([item]);}catch(e){if(signal.aborted)return;mark(file,item.i,{text:'',status:'failed',error:e instanceof Error?e.message:'هەڵەی وەرگێڕان'});if(e instanceof Error && e.name==='ProviderUnavailable'){flush(file);throw e;}}}
   }
   flush(file);
  }
 }
}
