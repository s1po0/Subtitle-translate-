import {describe,it,expect} from 'vitest';
import {wordsToSubtitle} from './captions';
import {exportSubtitle,parseSubtitle} from './subtitles';
describe('timed caption generation',()=>{
 it('groups timestamped words into a valid SRT without reordering',()=>{const doc=wordsToSubtitle([{text:'Hello',start:0.2,end:0.6},{text:'there.',start:0.7,end:1.0},{text:'Next',start:2.5,end:3}],4);expect(doc.cues).toHaveLength(2);const srt=exportSubtitle(doc,doc.cues.map(c=>c.text),'srt');const out=parseSubtitle(srt,'srt');expect(out.cues.map(c=>[c.start,c.end,c.text])).toEqual([['00:00:00,200','00:00:01,000','Hello there.'],['00:00:02,500','00:00:03,000','Next']]);});
 it('rejects missing, invalid, out-of-order, or excessive timestamps',()=>{for(const input of [[],[{text:'a',start:0,end:0}],[{text:'a',start:2,end:3},{text:'b',start:1,end:2}],[{text:'a',start:0,end:50}]])expect(()=>wordsToSubtitle(input,10)).toThrow();});
});
