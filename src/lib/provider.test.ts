import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoogleFree, withRetry } from './provider';
const nativeMock=vi.hoisted(()=>({isNative:vi.fn(()=>false),post:vi.fn()}));
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:nativeMock.isNative},CapacitorHttp:{post:nativeMock.post}}));
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

describe('Android native transport',()=>{
 it('uses native HTTP rather than browser fetch',async()=>{
  nativeMock.isNative.mockReturnValue(true);
  nativeMock.post.mockResolvedValue({status:200,data:[[['سڵاو','Hello']],null,'en'],headers:{},url:'https://translate.googleapis.com/'});
  try {const out=await new GoogleFree().translate(['Hello'],'auto',new AbortController().signal);expect(out[0]).toEqual({text:'سڵاو',detected:'en'});expect(nativeMock.post).toHaveBeenCalledOnce();} finally {nativeMock.isNative.mockReturnValue(false);nativeMock.post.mockReset();}
 });
});
