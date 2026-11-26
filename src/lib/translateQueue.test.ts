// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import { translateQueue } from './translateQueue';
import { parseSubtitle } from './subtitles';
import type { SessionFile } from './session';
import type { TranslationProvider } from './provider';
function fixture(name:string,n:number):SessionFile {const text=Array.from({length:n},(_,i)=>`${i+1}\n00:00:01,000 --> 00:00:03,000\nHello ${i} ♪`).join('\n\n');const doc=parseSubtitle(text,'srt');return {doc,name,encoding:'utf-8',rows:doc.cues.map(()=>({text:'',status:'pending'})),output:'srt',detected:''};}
describe('multi-file translation queue',()=>{
 it('translates 1000 cues across files without changing time or order',async()=>{const files=[fixture('one.srt',500),fixture('two.srt',500)];const before=files.map(f=>f.doc.cues.map(c=>[c.start,c.end]));let progress=0;const provider:TranslationProvider={name:'queue-test',translate:vi.fn(async (text:string[])=>text.map(t=>({text:t.replace('Hello','سڵاو'),detected:'en'})))};
 await translateQueue(files,{provider,source:'auto',glossary:[],signal:new AbortController().signal,batchSize:32,onlyFailed:false,onRow:(file,i,row)=>{files[file].rows[i]=row;},onProgress:(n,total)=>{progress=n/total;}});
 expect(files.flatMap(f=>f.rows)).toHaveLength(1000);expect(files.every(f=>f.rows.every(r=>r.status==='done'&&r.text.includes('♪')))).toBe(true);expect(files.map(f=>f.doc.cues.map(c=>[c.start,c.end]))).toEqual(before);expect(progress).toBe(1);});
 it('preserves edited and completed rows, and cancels without requests',async()=>{const file=fixture('three.srt',2);file.rows[0]={text:'دەستکاری',status:'edited'};const translate=vi.fn(async()=>[]);const controller=new AbortController();controller.abort();await translateQueue([file],{provider:{name:'cancel-test',translate},source:'auto',glossary:[],signal:controller.signal,batchSize:10,onlyFailed:false,onRow:()=>{},onProgress:()=>{}});expect(translate).not.toHaveBeenCalled();expect(file.rows[0].text).toBe('دەستکاری');});
 it('automatically processes thirteen files in order and resumes without overwriting edits',async()=>{
  const files=Array.from({length:13},(_,i)=>fixture(`file-${i}.srt`,3));
  files[0].rows[0]={text:'بەدەست نووسراو',status:'edited'};
  files[1].rows[0]={text:'پێشتر وەرگێڕدراو',status:'done'};
  const order:number[]=[];let last=0;const provider:TranslationProvider={name:'thirteen-files-test',translate:vi.fn(async (texts:string[])=>texts.map(text=>({text:text.replace('Hello','سڵاو')})))};
  await translateQueue(files,{provider,source:'auto',glossary:[],signal:new AbortController().signal,batchSize:32,onlyFailed:false,onRow:(f,i,row)=>{order.push(f);files[f].rows[i]=row;},onProgress:(done,total)=>{last=done/total;}});
  expect([...new Set(order)]).toEqual(Array.from({length:13},(_,i)=>i));
  expect(files.every(f=>f.rows.every(r=>r.status==='done'||r.status==='edited'))).toBe(true);
  expect(files[0].rows[0].text).toBe('بەدەست نووسراو');expect(files[1].rows[0].text).toBe('پێشتر وەرگێڕدراو');expect(last).toBe(1);
 });

 it('applies completed rows together and reuses the cache on a later run',async()=>{
  const first=fixture('cache.srt',12),second=fixture('again.srt',12);let batches=0;
  const translate=vi.fn(async(texts:string[])=>texts.map(text=>({text:text.replace('Hello','سڵاو')})));
  const provider:TranslationProvider={name:'bulk-cache-test',translate};
  const run=(f:SessionFile)=>translateQueue([f],{provider,source:'auto',glossary:[],signal:new AbortController().signal,batchSize:32,onlyFailed:false,onRows:(_file,updates)=>{batches++;for(const u of updates)f.rows[u.index]=u.row;},onProgress:()=>{}});
  await run(first);expect(batches).toBe(1);expect(translate).toHaveBeenCalledTimes(1);await run(second);expect(translate).toHaveBeenCalledTimes(1);expect(second.rows.every(r=>r.status==='done')).toBe(true);
 });

});

it('translates bracketed speech and sound descriptions without changing timing',async()=>{
 const doc=parseSubtitle('1\n00:00:01,000 --> 00:00:03,000\n[Music plays]','srt');const f:SessionFile={doc,name:'brackets.srt',encoding:'utf-8',rows:[{text:'',status:'pending'}],output:'srt',detected:''};
 const provider:TranslationProvider={name:'bracket-v2-mock',translate:async texts=>texts.map(text=>({text:text.replace('Music plays','مۆسیقا دەژەنێت')}))};
 await translateQueue([f],{provider,source:'en',glossary:[],signal:new AbortController().signal,batchSize:10,onlyFailed:false,onRow:(_f,i,row)=>{f.rows[i]=row;},onProgress:()=>{}});
 expect(f.rows[0]).toEqual({text:'[مۆسیقا دەژەنێت]',status:'done'});expect([doc.cues[0].start,doc.cues[0].end]).toEqual(['00:00:01,000','00:00:03,000']);
});

function contextFixture():SessionFile {
 const doc=parseSubtitle('1\n00:00:01,000 --> 00:00:02,000\nI thought that\n\n2\n00:00:02,100 --> 00:00:04,000\nyou were coming.','srt');return {doc,name:'context.srt',encoding:'utf-8',rows:doc.cues.map(()=>({text:'',status:'pending'})),output:'srt',detected:''};
}
it('groups a continued sentence and restores each cue with original timing',async()=>{
 const f=contextFixture(),before=f.doc.cues.map(c=>[c.start,c.end]);const translate=vi.fn(async(texts:string[])=>texts.map(text=>({text:text.replace('I thought that','وام زانی').replace('you were coming.','تۆ دێیت.')})));
 await translateQueue([f],{provider:{name:'context-success',translate},source:'en',glossary:[],signal:new AbortController().signal,batchSize:10,onlyFailed:false,onRow:(_f,i,row)=>{f.rows[i]=row;},onProgress:()=>{}});
 expect(translate.mock.calls[0][0]).toHaveLength(1);expect(f.rows.map(r=>r.text)).toEqual(['وام زانی','تۆ دێیت.']);expect(f.doc.cues.map(c=>[c.start,c.end])).toEqual(before);
});
it('falls back to separate translation when the boundary is lost',async()=>{
 const f=contextFixture();const translate=vi.fn(async(texts:string[])=>texts.map(text=>({text:text.includes('ZXQ0QXZ')?'marker missing':text.replace('I thought that','وام زانی').replace('you were coming.','تۆ دێیت.')})));
 await translateQueue([f],{provider:{name:'context-fallback',translate},source:'en',glossary:[],signal:new AbortController().signal,batchSize:10,onlyFailed:false,onRow:(_f,i,row)=>{f.rows[i]=row;},onProgress:()=>{}});
 expect(translate).toHaveBeenCalledTimes(3);expect(f.rows.map(r=>r.text)).toEqual(['وام زانی','تۆ دێیت.']);
});
it('does not join across edited cues or when disabled',async()=>{
 const f=contextFixture();f.rows[1]={text:'دەستکاری',status:'edited'};const translate=vi.fn(async(texts:string[])=>texts.map(text=>({text})));
 await translateQueue([f],{provider:{name:'context-edit',translate},source:'en',glossary:[],signal:new AbortController().signal,batchSize:10,onlyFailed:false,retranslate:true,onRow:(_f,i,row)=>{f.rows[i]=row;},onProgress:()=>{}});
 expect(translate.mock.calls[0][0][0]).not.toContain('ZXQ');expect(f.rows[1].text).toBe('دەستکاری');
 const g=contextFixture();await translateQueue([g],{provider:{name:'context-disabled',translate},source:'en',glossary:[],signal:new AbortController().signal,batchSize:10,onlyFailed:false,context:false,onRow:(_f,i,row)=>{g.rows[i]=row;},onProgress:()=>{}});expect(translate.mock.calls[1][0]).toHaveLength(2);
});

it('propagates rate limiting on a contextual pair without further requests',async()=>{
 const f=contextFixture();const failure=new Error('limit');failure.name='ProviderUnavailable';const translate=vi.fn(async()=>{throw failure;});
 await expect(translateQueue([f],{provider:{name:'context-limit',translate},source:'en',glossary:[],signal:new AbortController().signal,batchSize:10,onlyFailed:false,onRow:(_f,i,row)=>{f.rows[i]=row;},onProgress:()=>{}})).rejects.toThrow('limit');
 expect(translate).toHaveBeenCalledTimes(1);expect(f.rows.map(r=>r.status)).toEqual(['failed','failed']);
});
it('caches context as a pair, not as misleading standalone fragments',async()=>{
 const first=contextFixture(),second=contextFixture();const translate=vi.fn(async(texts:string[])=>texts.map(text=>({text:text.replace('I thought that','وام زانی').replace('you were coming.','تۆ دێیت.')})));
 const run=(f:SessionFile)=>translateQueue([f],{provider:{name:'context-cache',translate},source:'en',glossary:[],signal:new AbortController().signal,batchSize:10,onlyFailed:false,onRow:(_f,i,row)=>{f.rows[i]=row;},onProgress:()=>{}});
 await run(first);await run(second);expect(translate).toHaveBeenCalledTimes(1);expect(second.rows.map(r=>r.text)).toEqual(['وام زانی','تۆ دێیت.']);
});

it('keeps translations and cache separated by target, with tags and glossary preserved',async()=>{
 const doc=parseSubtitle('1\n00:00:01,000 --> 00:00:02,000\n<i>Hello John</i>','srt');
 const make=():SessionFile=>({doc,name:'target.srt',encoding:'utf-8',rows:[{text:'',status:'pending'}],output:'srt',detected:''});
 const translate=vi.fn(async(texts:string[])=>texts.map(text=>({text:text.replace('Hello','Silav')})));
 const run=(file:SessionFile,target:'ckb'|'ku')=>translateQueue([file],{provider:{name:'target-cache-check',translate},source:'en',glossary:['John'],target,signal:new AbortController().signal,batchSize:10,onlyFailed:false,onRow:(_f,i,row)=>{file.rows[i]=row;},onProgress:()=>{}});
 const ku=make(),ckb=make(),again=make();await run(ku,'ku');await run(ckb,'ckb');await run(again,'ku');
 expect(translate).toHaveBeenCalledTimes(2);expect(ku.rows[0].text).toBe('<i>سلاڤ John</i>');expect(ckb.rows[0].text).toBe('<i>Silav John</i>');expect(again.rows[0]).toEqual(ku.rows[0]);
 expect(doc.cues[0].start).toBe('00:00:01,000');expect(doc.cues[0].end).toBe('00:00:02,000');
});

it('converts suspected Latin names for Arabic to Sorani, keeps protected names and respects the setting and cache',async()=>{
 const doc=parseSubtitle('1\n00:00:01,000 --> 00:00:03,000\n<i>مرحبا طارق John</i>','srt');
 const make=():SessionFile=>({doc,name:'arabic.srt',encoding:'utf-8',rows:[{text:'',status:'pending'}],output:'srt',detected:''});
 const translate=vi.fn(async(texts:string[])=>texts.map(text=>({text:text.replace('مرحبا طارق','سڵاو Tariq')})));
 const run=(f:SessionFile,arabicNames:boolean)=>translateQueue([f],{provider:{name:'arabic-names-cache',translate},source:'ar',target:'ckb',glossary:['John'],arabicNames,signal:new AbortController().signal,batchSize:10,onlyFailed:false,onRow:(_f,i,row)=>{f.rows[i]=row;},onProgress:()=>{}});
 const a=make(),b=make();await run(a,true);await run(b,false);
 expect(a.rows[0].text).toBe('<i>سڵاو تاریق John</i>');expect(b.rows[0].text).toBe('<i>سڵاو Tariq John</i>');expect(translate).toHaveBeenCalledTimes(1);expect(doc.cues[0].start).toBe('00:00:01,000');expect(doc.cues[0].end).toBe('00:00:03,000');
});
