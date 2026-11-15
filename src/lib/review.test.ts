import {describe,it,expect} from 'vitest';
import {parseSubtitle} from './subtitles';
import {fileSummary,isIncomplete,reviewHints} from './review';
const cue=parseSubtitle('1\n00:00:01,000 --> 00:00:03,000\n<i>Hello there</i>','srt').cues[0];
describe('export and review safety',()=>{
 it('flags failed, pending, and cleared edits, but permits empty original sound cues',()=>{
  expect(isIncomplete(cue,{text:'',status:'pending'})).toBe(true);expect(isIncomplete(cue,{text:'',status:'edited'})).toBe(true);expect(isIncomplete(cue,{text:'سڵاو',status:'done'})).toBe(false);
  expect(isIncomplete({...cue,text:''},{text:'',status:'done'})).toBe(false);
 });
 it('flags potentially untranslated English but not Kurdish edits',()=>{
  expect(reviewHints(cue,{text:'<i>Hello there</i>',status:'done'}).unchanged).toBe(true);expect(reviewHints(cue,{text:'سڵاو',status:'edited'}).unchanged).toBe(false);expect(reviewHints(cue,{text:'',status:'pending'}).unchanged).toBe(false);
 });
 it('counts failed and complete rows',()=>{expect(fileSummary([cue,cue],[{text:'سڵاو',status:'done'},{text:'',status:'failed'}])).toEqual({complete:1,failed:1,total:2});});
});
