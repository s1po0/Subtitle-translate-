import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoogleFree, withRetry } from './provider';
const nativeMock=vi.hoisted(()=>({isNative:vi.fn(()=>false),post:vi.fn(),batch:vi.fn()}));
vi.mock('google-translate-api-x',()=>({batchTranslate:nativeMock.batch}));
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

describe('batched Android translations',()=>{
 it('sends unique cues in one batch and maps duplicates back in order',async()=>{
  nativeMock.isNative.mockReturnValue(true);
  nativeMock.batch.mockResolvedValue([{text:'یەک',from:{language:{iso:'en'}}},{text:'دوو',from:{language:{iso:'en'}}}]);
  try{const out=await new GoogleFree().translate(['one','two','one'],'auto',new AbortController().signal);expect(out.map(x=>x.text)).toEqual(['یەک','دوو','یەک']);expect(nativeMock.batch).toHaveBeenCalledWith(['one','two'],expect.objectContaining({to:'ckb',forceTo:true}));}finally{nativeMock.isNative.mockReturnValue(false);nativeMock.batch.mockReset();}
 });
 it('falls back to individual translation if batch loses a protected marker',async()=>{
  nativeMock.isNative.mockReturnValue(true);nativeMock.batch.mockResolvedValue([{text:'lost',from:{language:{iso:'en'}}},{text:'two',from:{language:{iso:'en'}}}]);
  nativeMock.post.mockImplementation(async (opts:{data:string})=>({status:200,data:[[[new URLSearchParams(opts.data).get('q'),'source']],null,'en'],headers:{},url:''}));
  try{const out=await new GoogleFree().translate(['ZXQ0QXZ','two'],'auto',new AbortController().signal);expect(out.map(x=>x.text)).toEqual(['ZXQ0QXZ','two']);expect(nativeMock.post).toHaveBeenCalledTimes(2);}finally{nativeMock.isNative.mockReturnValue(false);nativeMock.batch.mockReset();nativeMock.post.mockReset();}
 });
});


describe('rate limiting',()=>{
 it('stops on a 429 without falling back to individual requests and respects cooldown',async()=>{
  vi.useFakeTimers();nativeMock.isNative.mockReturnValue(true);
  nativeMock.post.mockResolvedValue({status:429,data:'',headers:{'Retry-After':'120'},url:''});
  nativeMock.batch.mockImplementation(async (_texts,opts)=>opts.requestFunction('https://translate.google.com', {body:'x'}));
  try {
   const provider=new GoogleFree();const signal=new AbortController().signal;
   await expect(withRetry(()=>provider.translate(['one','two'],'auto',signal),signal)).rejects.toMatchObject({name:'ProviderUnavailable',message:expect.stringContaining('429')});
   expect(nativeMock.post).toHaveBeenCalledTimes(1);
   await expect(provider.translate(['one'],'auto',signal)).rejects.toMatchObject({name:'ProviderUnavailable'});
   expect(nativeMock.post).toHaveBeenCalledTimes(1);
   vi.advanceTimersByTime(120001);
   nativeMock.post.mockResolvedValue({status:200,data:[[['سڵاو','hello']],null,'en'],headers:{},url:''});
   expect((await provider.translate(['hello'],'auto',signal))[0].text).toBe('سڵاو');
  } finally {vi.useRealTimers();nativeMock.isNative.mockReturnValue(false);nativeMock.batch.mockReset();nativeMock.post.mockReset();}
 });
});
