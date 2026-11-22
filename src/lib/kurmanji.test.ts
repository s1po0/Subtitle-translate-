// @vitest-environment jsdom
import {describe,it,expect} from 'vitest';
import {kurmanjiHtml,transliterateWord} from './kurmanji';
import {protect,restore} from './text';

describe('approximate Kurmanji script conversion',()=>{
 it('converts Hawar letters and initial vowels',()=>{
  expect(transliterateWord('Ez')).toBe('ئەز');expect(transliterateWord('çav')).toBe('چاڤ');expect(transliterateWord('roj')).toBe('رۆژ');expect(transliterateWord('şêr')).toBe('شێر');expect(transliterateWord('û')).toBe('ئوو');expect(transliterateWord('min')).toBe('من');
 });
 it('keeps protected names, brackets, tags and line breaks',()=>{
  const input=protect('<i>[Hello John ♪]</i>\\NHow are you?', ['John']);
  const out=input.html.replace('Hello','Silav').replace('How are you?','Tu çawa yî?');
  expect(restore(kurmanjiHtml(out,input.html),input.tokens)).toBe('<i>[سلاڤ John ♪]</i>\\Nتو چاوا یی?');
 });
 it('does not mask an unchanged source response',()=>{
  const input=protect('Hello John');expect(restore(kurmanjiHtml(input.html,input.html),input.tokens)).toBe('Hello John');
 });
 it('does not convert placeholders or HTML attributes',()=>{
  const html='<span class="notranslate">ZXQ0QXZ</span> Silav<br>çawa';
  const result=kurmanjiHtml(html,'hello');expect(result).toContain('class="notranslate"');expect(result).toContain('ZXQ0QXZ');expect(result).toContain('سلاڤ');expect(result).toContain('<br>چاوا');
 });
});
