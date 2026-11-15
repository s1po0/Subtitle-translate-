import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { loadSession, saveSession } from './session';
import { parseSubtitle } from './subtitles';
it('persists the file, cue edits and timing for recovery',async()=>{
 const doc=parseSubtitle('1\n00:00:01,000 --> 00:00:03,000\nHello','srt');
 const session={files:[{doc,name:'movie.srt',encoding:'utf-8',rows:[{text:'سڵاو',status:'edited' as const}],output:'srt' as const,detected:'en'}],activeFile:0};
 await saveSession(session);expect(await loadSession()).toEqual(session);
});
