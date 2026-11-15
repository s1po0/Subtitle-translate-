// @vitest-environment jsdom
import { describe,it,expect } from 'vitest';
import { normalize,protect,restore } from './text';
describe('subtitle text',()=>{it('protects and restores tags, sound effects, names and music',()=>{const text='- <i>John</i> ♪ [music] {\\an8}';const p=protect(text,['John']);expect(p.html).toContain('class="notranslate"');expect(restore(p.html,p.tokens)).toBe(text);});it('decodes HTML without rendering it',()=>{expect(restore('A &amp; B &lt;good&gt;',[])).toBe('A & B <good>');});it('normalizes Kurdish letters and optional digits',()=>{expect(normalize('ك ي ى 123',{digits:true,rtl:false,wrap:false,replacements:''})).toBe('ک ی ی ١٢٣');});});
