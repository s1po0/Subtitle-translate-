import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoogleFree, withRetry } from './provider';
describe('keyless Google provider',()=>{
 afterEach(()=>vi.unstubAllGlobals());
 it('requests Sorani without a user key and maps responses to cues',async()=>{
  const fetchMock=vi.fn().mockImplementation(async (_url:string,init:RequestInit)=>{const body=new URLSearchParams(String(init.body));return new Response(JSON.stringify([[[`سڵاو ${body.get('q')}`,body.get('q')]],null,'en']),{status:200});});
  vi.stubGlobal('fetch',fetchMock); const result=await new GoogleFree().translate(['one','two'],'auto',new AbortController().signal);
  expect(result).toEqual([{text:'سڵاو one',detected:'en'},{text:'سڵاو two',detected:'en'}]);
  const [url,init]=fetchMock.mock.calls[0]; expect(url.toString()).toContain('tl=ckb'); expect(url.toString()).not.toContain('key='); expect(init.method).toBe('POST');
 });
 it('reports unavailable browser connection without retrying',async()=>{const fetchMock=vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));vi.stubGlobal('fetch',fetchMock);const controller=new AbortController();await expect(withRetry(()=>new GoogleFree().translate(['hello'],'auto',controller.signal),controller.signal)).rejects.toMatchObject({name:'ProviderUnavailable'});expect(fetchMock).toHaveBeenCalledTimes(1);});
});
