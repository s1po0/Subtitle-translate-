// @vitest-environment jsdom
import { describe,it,expect } from 'vitest';
import { normalize,protect,restore,rtlPreference } from './text';
describe('subtitle text',()=>{it('protects and restores tags, sound effects, names and music',()=>{const text='- <i>John</i> ♪ [music] {\\an8}';const p=protect(text,['John']);expect(p.html).toContain('class="notranslate"');expect(restore(p.html,p.tokens)).toBe(text);});it('decodes HTML without rendering it',()=>{expect(restore('A &amp; B &lt;good&gt;',[])).toBe('A & B <good>');});it('normalizes Kurdish letters and optional digits',()=>{expect(normalize('ك ي ى 123',{digits:true,rtl:false,wrap:false,replacements:''})).toBe('ک ی ی ١٢٣');});});

describe('right-to-left export',()=>{
 const opts={digits:false,rtl:true,wrap:false,replacements:''};
 it('brackets each SRT/VTT line and is idempotent',()=>{
  const input='سڵاو دنیا.\n- Hello سڵاو!';const result=normalize(input,opts);
  expect(result).toBe('\u202b\u200fسڵاو دنیا.\u200f\u202c\n\u202b\u200f- Hello سڵاو!\u200f\u202c');
  expect(normalize(result,opts)).toBe(result);
  expect(normalize(input,{...opts,rtl:false})).toBe(input);
 });
 it('leaves ASS tags, inline formatting and line breaks intact',()=>{
  const input='{\\an8}<i>سڵاو.</i>\\N{\\i1}دنیا!';const result=normalize(input,opts);
  expect(result).toBe('{\\an8}\u202b\u200f<i>سڵاو.</i>\u200f\u202c\\N{\\i1}\u202b\u200fدنیا!\u200f\u202c');
  expect(normalize(result,opts)).toBe(result);
 });
 it('places terminal punctuation correctly under both LTR and RTL paragraph directions',async()=>{
  const bidi=(await import('bidi-js')).default();
  for(const source of ['سڵاو دنیا.','سڵاو John.','- سڵاو John!']){
   const marked=normalize(source,opts);
   for(const direction of ['ltr','rtl'] as const){const visual=bidi.getReorderedString(marked,bidi.getEmbeddingLevels(marked,direction)).replace(/[\u200f\u202b\u202c]/g,'');expect(visual.startsWith(source.endsWith('!')?'!':'.')).toBe(true);}
  }
 });
});

it('enables RTL for new and previously saved settings, while respecting the new opt-out',()=>{
 expect(rtlPreference({})).toBe(true);expect(rtlPreference({rtl:false})).toBe(true);expect(rtlPreference({rtl:false,rtlFixVersion:1})).toBe(false);expect(rtlPreference({rtl:true,rtlFixVersion:1})).toBe(true);
});

describe('translating text in square brackets',()=>{
 it('sends contents for translation while preserving brackets, tags, music and glossary',()=>{
  const p=protect('- <i>[John is singing ♪]</i> [music]', ['John']);
  expect(p.html).toContain('is singing');expect(p.html).toContain('music');expect(p.tokens).toContain('[');expect(p.tokens).toContain(']');expect(p.tokens).not.toContain('[music]');
  const translated=p.html.replace('is singing','گۆرانی دەڵێت').replace('music','مۆسیقا');
  expect(restore(translated,p.tokens)).toBe('- <i>[John گۆرانی دەڵێت ♪]</i> [مۆسیقا]');
 });
 it('handles nested, repeated, empty and unmatched brackets',()=>{
  for(const source of ['[Hello [world]] [music]','[] hi [','] hello']){const p=protect(source);expect(restore(p.html,p.tokens)).toBe(source);}
 });
 it('rejects reversed, missing or duplicated protected brackets',()=>{
  const p=protect('[hello]');expect(()=>restore('ZXQ1QXZ سڵاو ZXQ0QXZ',p.tokens)).toThrow();expect(()=>restore('ZXQ0QXZ سڵاو',p.tokens)).toThrow();expect(()=>restore('ZXQ0QXZ ZXQ0QXZ سڵاو ZXQ1QXZ',p.tokens)).toThrow();
 });
});
