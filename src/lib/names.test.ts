// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { nameToKurdish, transliterateNames } from './names';
describe('conservative names',()=>{
 it('writes capitalized Latin names approximately, with Kurdish context',()=>{
  expect(nameToKurdish('Tariq')).toBe('تاریق');
  expect(transliterateNames('سڵاو Tariq!', 'مرحبا طارق')).toBe('سڵاو تاریق!');
 });
 it('leaves protected placeholders, tags, URLs, acronyms and source Latin intact',()=>{
  const input='مرحبا John <span class="notranslate">ZXQ0QXZ</span>';
  const output='<span class="notranslate">ZXQ0QXZ</span> سڵاو John NASA https://example.com <i>Tariq</i>';
  expect(transliterateNames(output,input)).toBe('<span class="notranslate">ZXQ0QXZ</span> سڵاو John NASA https://example.com <i>تاریق</i>');
 });
 it('leaves non Arabic source and entirely Latin translations untouched',()=>{
  expect(transliterateNames('سڵاو Tariq','Hello Tariq')).toBe('سڵاو Tariq');
  expect(transliterateNames('Hello Tariq','مرحبا طارق')).toBe('Hello Tariq');
 });
});
