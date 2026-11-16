import 'fake-indexeddb/auto';
import {describe,it,expect} from 'vitest';
import {clearCheckpoint,loadCheckpoint,saveCheckpoint} from './captionCheckpoint';
import type {CaptionProgress} from './captions';
describe('caption recovery',()=>{
 it('restores only the exact fingerprint, duration and checkpoint version',async()=>{
  await clearCheckpoint();const progress={next:2,words:[{text:'hi',start:3,end:4}],warnings:0};
  expect(await saveCheckpoint({version:2,fingerprint:'abc',duration:300,progress})).toBe(true);
  expect(await loadCheckpoint('abc',300)).toEqual(progress);expect(await loadCheckpoint('different',300)).toBeUndefined();expect(await loadCheckpoint('abc',301)).toBeUndefined();
  expect(await clearCheckpoint()).toBe(true);expect(await loadCheckpoint('abc',300)).toBeUndefined();
 });
});
it('persists completed chunks after a later failure and resumes without resending',async()=>{
 const {transcribeChunks}=await import('./captions');await clearCheckpoint();const progress:CaptionProgress={next:0,words:[],warnings:0};let n=0;
 const transcribe=async()=>{n++;if(n===2)throw Error('offline');return {text:'hi',words:[{text:'hi',start:3,end:4}]};};
 const save=async(p:typeof progress)=>{expect(await saveCheckpoint({version:2,fingerprint:'movie',duration:200,progress:p})).toBe(true);};
 await expect(transcribeChunks(200,progress,async()=>({audio:new Blob(),silent:false}),transcribe,()=>{},save)).rejects.toThrow('offline');
 const restored=await loadCheckpoint('movie',200);expect(restored?.next).toBe(1);
 await transcribeChunks(200,restored!,async()=>({audio:new Blob(),silent:false}),transcribe,()=>{},save);
 expect(n).toBe(3);expect(restored?.words.map(w=>w.start)).toEqual([3,117]);await clearCheckpoint();
});
