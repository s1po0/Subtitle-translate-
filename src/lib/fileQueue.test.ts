import { describe,expect,it } from 'vitest';
import { appendFiles } from './fileQueue';
import { parseSubtitle } from './subtitles';
import type { SessionFile } from './session';
const entry=(name:string,text=''):SessionFile=>({name,encoding:'utf-8',doc:parseSubtitle('1\n00:00:01,000 --> 00:00:02,000\nHello','srt'),rows:[{text,status:text?'edited':'pending'}],output:'srt',detected:''});
describe('multi-file queue',()=>{
 it('appends selections without losing edits in the active file',()=>{const out=appendFiles([entry('a.srt'),entry('b.srt')],0,entry('a.srt','سڵاو'),[entry('c.srt'),entry('d.srt')]);expect(out.map(x=>x.name)).toEqual(['a.srt','b.srt','c.srt','d.srt']);expect(out[0].rows[0].text).toBe('سڵاو');});
 it('keeps same-named files instead of discarding potentially different subtitles',()=>{expect(appendFiles([entry('a.srt')],0,entry('a.srt'),[entry('a.srt')])).toHaveLength(2);});
});
