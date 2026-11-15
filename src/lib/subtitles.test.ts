import { describe, it, expect } from 'vitest';
import { parseSubtitle, exportSubtitle } from './subtitles';

describe('subtitle formats',()=>{
 it('round trips 1000 SRT cues with identical timing and order',()=>{const input=Array.from({length:1000},(_,i)=>`${i+1}\n00:00:01,000 --> 00:00:03,500\n<i>Hello ${i}</i> ♪`).join('\n\n'); const doc=parseSubtitle(input,'srt'); const result=parseSubtitle(exportSubtitle(doc,doc.cues.map(c=>c.text),'srt'),'srt');expect(result.cues).toHaveLength(1000); expect(result.cues.map(c=>[c.start,c.end,c.text])).toEqual(doc.cues.map(c=>[c.start,c.end,c.text]));});
 it('skips VTT non-cue blocks and preserves identifiers and settings',()=>{const doc=parseSubtitle('WEBVTT\n\nNOTE something\nignore\n\nSTYLE\n::cue { color: red }\n\nREGION\nid:a\n\nid-1\n00:00:01.000 --> 00:00:02.000 align:start\nHello','vtt');expect(doc.cues).toHaveLength(1);expect(exportSubtitle(doc,['سڵاو'],'vtt')).toContain('id-1\n00:00:01.000 --> 00:00:02.000 align:start\nسڵاو');});
 it('handles ASS override tags, commas and metadata',()=>{const input='[Script Info]\nTitle: Test\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\nDialogue: 0,0:00:01.00,0:00:02.00,Default,,0,0,0,,{\\an8}Hello, world';const doc=parseSubtitle(input,'ass');expect(doc.cues[0].text).toBe('{\\an8}Hello, world');const out=exportSubtitle(doc,['{\\an8}سڵاو'],'ass');expect(out).toContain('0:00:01.00,0:00:02.00');expect(parseSubtitle(out,'ass').cues[0].text).toBe('{\\an8}سڵاو');});
 it('converts timestamps for browser VTT',()=>{const doc=parseSubtitle('1\n00:00:01,000 --> 00:00:02,500\nHello','srt');expect(exportSubtitle(doc,['سڵاو'],'vtt')).toContain('00:00:01.000 --> 00:00:02.500');});
});
