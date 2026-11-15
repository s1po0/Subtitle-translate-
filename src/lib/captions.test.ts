import {describe,it,expect,vi} from 'vitest';
import {wordsToSubtitle} from './captions';
import {exportSubtitle,parseSubtitle} from './subtitles';
describe('timed caption generation',()=>{
 it('groups timestamped words into a valid SRT without reordering',()=>{const doc=wordsToSubtitle([{text:'Hello',start:0.2,end:0.6},{text:'there.',start:0.7,end:1.0},{text:'Next',start:2.5,end:3}],4);expect(doc.cues).toHaveLength(2);const srt=exportSubtitle(doc,doc.cues.map(c=>c.text),'srt');const out=parseSubtitle(srt,'srt');expect(out.cues.map(c=>[c.start,c.end,c.text])).toEqual([['00:00:00,200','00:00:01,000','Hello there.'],['00:00:02,500','00:00:03,000','Next']]);});
 it('rejects missing, invalid, out-of-order, or excessive timestamps',()=>{for(const input of [[],[{text:'a',start:0,end:0}],[{text:'a',start:2,end:3},{text:'b',start:1,end:2}],[{text:'a',start:0,end:50}]])expect(()=>wordsToSubtitle(input,10)).toThrow();});
});

describe('chunked transcription',()=>{
 it('preserves offsets, skips silence, and retries without resending completed chunks',async()=>{
  const {transcribeChunks}=await import('./captions');const progress={next:0,words:[],warnings:0};const extract=vi.fn(async(start:number)=>({audio:new Blob([String(start)]),silent:start===240}));let requests=0;
  const transcribe=vi.fn(async()=>{requests++;if(requests===2)throw Error('network');return {text:'hi',words:[{text:'hi',start:1,end:2}]};});
  await expect(transcribeChunks(300,progress,extract,transcribe,()=>{})).rejects.toThrow('network');expect(progress.next).toBe(1);
  await transcribeChunks(300,progress,extract,transcribe,()=>{});expect(progress.next).toBe(3);expect(progress.words).toEqual([{text:'hi',start:1,end:2},{text:'hi',start:121,end:122}]);expect(extract.mock.calls.map(c=>c[0])).toEqual([0,120,120,240]);expect(transcribe).toHaveBeenCalledTimes(3);
 });
 it('rejects a transcript without valid timing',async()=>{const {transcribeChunks}=await import('./captions');const p={next:0,words:[],warnings:0};await expect(transcribeChunks(20,p,async()=>({audio:new Blob(),silent:false}),async()=>({text:'hello',words:[]}),()=>{})).rejects.toThrow();expect(p.next).toBe(0);});
});

describe('WAV chunking',()=>{
 it('keeps exact sample ranges and updates the WAV sizes',async()=>{const {sliceWav}=await import('./captions');const bytes=new Uint8Array(44+16000*2*3);for(let i=44;i<bytes.length;i++)bytes[i]=i%251;const part=await sliceWav(new Blob([bytes]),1,2);const arr=new Uint8Array(await part.arrayBuffer());const header=new DataView(arr.buffer);expect(arr.length).toBe(44+32000);expect(header.getUint32(4,true)).toBe(32036);expect(header.getUint32(40,true)).toBe(32000);expect(arr[44]).toBe(bytes[32044]);});
});

it('processes 30 minutes with correct offsets using bounded two-minute chunks',async()=>{
 const {transcribeChunks}=await import('./captions');const progress={next:0,words:[],warnings:0};const extract=vi.fn(async()=>({audio:new Blob(),silent:false}));
 await transcribeChunks(1800,progress,extract,async()=>({text:'test',words:[{text:'test',start:1,end:2}]}),()=>{});
 expect(extract).toHaveBeenCalledTimes(15);expect(progress.words[14]).toEqual({text:'test',start:1681,end:1682});expect(progress.next).toBe(15);
});
