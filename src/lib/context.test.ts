import { describe,expect,it } from 'vitest';
import { canJoinContinuation } from './context';
import { parseSubtitle } from './subtitles';
function pair(a:string,b:string,gap='00:00:02,100'){return parseSubtitle(`1\n00:00:01,000 --> 00:00:02,000\n${a}\n\n2\n${gap} --> 00:00:04,000\n${b}`,'srt').cues;}
describe('conservative context pairing',()=>{
 it('joins an obvious close English continuation',()=>{const [a,b]=pair('I thought that','you were coming.');expect(canJoinContinuation(a,b,'auto',[])).toBe(true);});
 it('does not guess across sentence endings, speakers, tags, brackets, glossary or long gaps',()=>{
  for(const [a,b,gap,terms] of [['I know.','you came.','00:00:02,100',[]],['I saw him','- he came.','00:00:02,100',[]],['<i>I saw','him</i>','00:00:02,100',[]],['I saw [him]','walking.','00:00:02,100',[]],['I saw John','walking.','00:00:02,100',['John']],['I saw him','walking.','00:00:06,100',[]]] as [string,string,string,string[]][]){const [x,y]=pair(a,b,gap);expect(canJoinContinuation(x,y,'en',terms)).toBe(false);}
 });
 it('does not infer other languages or begin at uppercase',()=>{const [a,b]=pair('I thought that','You were coming.');expect(canJoinContinuation(a,b,'en',[])).toBe(false);const [c,d]=pair('I thought that','you came.');expect(canJoinContinuation(c,d,'tr',[])).toBe(false);});
});
