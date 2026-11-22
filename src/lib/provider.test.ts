import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoogleFree, withRetry } from './provider';
const native=vi.hoisted(()=>({isNative:vi.fn(()=>false),post:vi.fn()}));
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:native.isNative},CapacitorHttp:{post:native.post}}));
afterEach(()=>{vi.unstubAllGlobals();native.isNative.mockReturnValue(false);native.post.mockReset();});
describe('Google widget translation',()=>{
 it('batches unique cues, preserves order and skips blanks',async()=>{
  const mock=vi.fn().mockResolvedValue(new Response(JSON.stringify([['یەک','دوو'],['en','en']]),{status:200}));vi.stubGlobal('fetch',mock);
  const output=await new GoogleFree().translate(['one','two','one',' '],'auto',new AbortController().signal);
  expect(output.map(x=>x.text)).toEqual(['یەک','دوو','یەک',' ']);expect(mock).toHaveBeenCalledOnce();
  const [url,init]=mock.mock.calls[0];expect(url).toContain('/translateHtml');expect(JSON.parse(init.body)).toEqual([[['one','two'],'auto','ckb'],'te_lib']);
 });
 it('uses Android native HTTP and sends an array payload',async()=>{
  native.isNative.mockReturnValue(true);native.post.mockResolvedValue({status:200,data:[['سڵاو','بەخێربێیت'],['en','en']],headers:{}});
  const out=await new GoogleFree().translate(['hello','welcome'],'auto',new AbortController().signal);
  expect(out.map(x=>x.text)).toEqual(['سڵاو','بەخێربێیت']);expect(native.post).toHaveBeenCalledOnce();expect(native.post.mock.calls[0][0].data).toEqual([[['hello','welcome'],'auto','ckb'],'te_lib']);
 });
 it('rejects incomplete results and lost formatting markers',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(new Response(JSON.stringify([['one']]))).mockResolvedValueOnce(new Response(JSON.stringify([['lost']]))));
  const provider=new GoogleFree(),signal=new AbortController().signal;
  await expect(provider.translate(['one','two'],'en',signal)).rejects.toThrow();
  await expect(provider.translate(['ZXQ0QXZ'],'en',signal)).rejects.toThrow();
 });

it('requests Kurmanji rather than Sorani on Android and web',async()=>{
 const mock=vi.fn().mockResolvedValue(new Response(JSON.stringify([['Silav'],['en']]),{status:200}));vi.stubGlobal('fetch',mock);
 await new GoogleFree('ku').translate(['hello'],'en',new AbortController().signal);
 expect(JSON.parse(mock.mock.calls[0][1].body)).toEqual([[['hello'],'en','ku'],'te_lib']);
 native.isNative.mockReturnValue(true);native.post.mockResolvedValue({status:200,data:[['Silav']],headers:{}});
 await new GoogleFree('ku').translate(['hello'],'en',new AbortController().signal);
 expect(native.post.mock.calls[0][0].data).toEqual([[['hello'],'en','ku'],'te_lib']);
});

 it('stops requests on 429 and waits at least Retry-After',async()=>{
  vi.useFakeTimers();native.isNative.mockReturnValue(true);native.post.mockResolvedValue({status:429,headers:{'Retry-After':'120'}});
  try {const p=new GoogleFree(),signal=new AbortController().signal;await expect(withRetry(()=>p.translate(['one','two'],'auto',signal),signal)).rejects.toMatchObject({name:'ProviderUnavailable'});await expect(p.translate(['one'],'auto',signal)).rejects.toMatchObject({name:'ProviderUnavailable'});expect(native.post).toHaveBeenCalledTimes(1);vi.advanceTimersByTime(120001);native.post.mockResolvedValue({status:200,data:[['سڵاو']],headers:{}});expect((await p.translate(['hello'],'auto',signal))[0].text).toBe('سڵاو');}finally{vi.useRealTimers();}
 });
});
