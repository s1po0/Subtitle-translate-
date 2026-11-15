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
});
