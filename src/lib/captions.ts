import type { Cue, Subtitle } from './subtitles';

export interface TimedWord {text:string;start:number;end:number}
function timestamp(seconds:number):string {
 const ms=Math.round(seconds*1000),h=Math.floor(ms/3600000),m=Math.floor(ms/60000)%60,s=Math.floor(ms/1000)%60,part=ms%1000;
 const pad=(n:number,len=2)=>String(n).padStart(len,'0');
 return `${pad(h)}:${pad(m)}:${pad(s)},${pad(part,3)}`;
}
/** Fail closed on missing or out-of-order timings; never invent a transcript. */
export function wordsToSubtitle(raw:unknown,duration:number):Subtitle {
 if(!Array.isArray(raw)||raw.length===0||!Number.isFinite(duration)||duration<=0)throw new Error('دەنگی کات‌دیاریکراو نەدۆزرایەوە.');
 const words:TimedWord[]=raw.map(value=>{
  if(!value||typeof value!=='object')throw new Error('کاتی وشەکان نادروستە.');
  const item=value as Record<string,unknown>;
  if(typeof item.text!=='string'||!item.text.trim()||typeof item.start!=='number'||typeof item.end!=='number'||!Number.isFinite(item.start)||!Number.isFinite(item.end)||item.start<0||item.end<=item.start||item.end>duration+1)throw new Error('کاتی وشەکان نادروستە.');
  return {text:item.text.trim(),start:item.start,end:Math.min(duration,item.end)};
 });
 for(let i=1;i<words.length;i++)if(words[i].start<words[i-1].start)throw new Error('ڕیزبەندی کاتی دەنگ نادروستە.');
 const cues:Cue[]=[];let group:TimedWord[]=[];
 function flush(){if(!group.length)return;const start=group[0].start,end=group[group.length-1].end;if(end<=start)throw new Error('کاتی ڕیز نادروستە.');cues.push({index:cues.length+1,start:timestamp(start),end:timestamp(end),text:group.map(word=>word.text).join(' ').replace(/\s+([,.!?،؛:])/g,'$1'),rawTags:[]});group=[];}
 for(const word of words){const first=group[0],previous=group[group.length-1];const text=group.map(item=>item.text).join(' ');if(group.length&&(word.end-first.start>5||text.length+word.text.length>42||word.start-previous.end>1.2))flush();group.push(word);if(/[.!?؟]$/.test(word.text))flush();}flush();
 return {format:'srt',cues};
}

/** Extract only the soundtrack, resample to 16 kHz mono, and encode as WAV. */
export async function videoToWav(file:File):Promise<{audio:Blob;duration:number}> {
 const MAX_BYTES=75*1024*1024,MAX_SECONDS=180;
 if(file.size>MAX_BYTES)throw new Error('ڤیدیۆکە زۆر گەورەیە؛ سنووری ئەم وەشانە ٧٥ مێگابایتە.');
 const url=URL.createObjectURL(file);const video=document.createElement('video');video.preload='metadata';
 let duration:number;
 try {duration=await new Promise((resolve,reject)=>{video.onloadedmetadata=()=>resolve(video.duration);video.onerror=()=>reject(new Error('ڤیدیۆکە نەخوێندرایەوە.'));video.src=url;});}
 finally {video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
 if(!Number.isFinite(duration)||duration<=0||duration>MAX_SECONDS)throw new Error('درێژی ڤیدیۆ دەبێت لە ٣ خولەک کەمتر بێت.');
 const context=new AudioContext();let buffer:AudioBuffer;
 try{buffer=await context.decodeAudioData(await file.arrayBuffer());}catch{throw new Error('دەنگی ڤیدیۆ نەخوێندرایەوە؛ فۆرماتی ڤیدیۆ یان دەنگەکە پشتیوانی ناکرێت.');}finally{await context.close();}
 if(!buffer.numberOfChannels||buffer.duration>MAX_SECONDS+1)throw new Error('دەنگی ڤیدیۆ نادروستە یان زۆر درێژە.');
 const sampleRate=16000;const offline=new OfflineAudioContext(1,Math.ceil(buffer.duration*sampleRate),sampleRate);const input=offline.createBufferSource();input.buffer=buffer;input.connect(offline.destination);input.start();const mono=await offline.startRendering();
 const data=mono.getChannelData(0);const bytes=new ArrayBuffer(44+data.length*2);const view=new DataView(bytes);const write=(offset:number,value:string)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
 write(0,'RIFF');view.setUint32(4,36+data.length*2,true);write(8,'WAVE');write(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);write(36,'data');view.setUint32(40,data.length*2,true);
 let peak=0;for(let i=0;i<data.length;i++){const v=Math.max(-1,Math.min(1,data[i]));peak=Math.max(peak,Math.abs(v));view.setInt16(44+i*2,v<0?v*32768:v*32767,true);}if(peak<0.00001)throw new Error('دەنگ لە ڤیدیۆکەدا نەدۆزرایەوە.');
 return {audio:new Blob([bytes],{type:'audio/wav'}),duration:buffer.duration};
}

export interface CaptionChunk {audio:Blob;silent:boolean}
export interface CaptionResult {text?:string;words?:unknown}
export interface CaptionProgress {next:number;words:TimedWord[];warnings:number}
/** Completed chunks can be retried in memory without sending them or charging again. */
export async function transcribeChunks(duration:number,progress:CaptionProgress,extract:(start:number,end:number)=>Promise<CaptionChunk>,transcribe:(audio:Blob)=>Promise<CaptionResult>,update:(done:number,total:number)=>void):Promise<CaptionProgress> {
 const size=120,total=Math.ceil(duration/size);
 for(let index=progress.next;index<total;index++){
  update(index,total);const start=index*size,end=Math.min(duration,start+size);const chunk=await extract(start,end);
  if(!chunk.silent){
   const result=await transcribe(chunk.audio);const text=result.text||'';
   if(!Array.isArray(result.words)||!result.words.length){if(text.trim())throw new Error('دەقی ئەم بەشە کاتی وشەی نییە؛ هیچ ژێرنووسێکی تەواو دروست نەکرا.');progress.warnings++;}
   else {
    const local=wordsToSubtitle(result.words,end-start);
    const full=text.replace(/[^\p{L}\p{N}]/gu,'').toLowerCase(),timed=local.cues.map(c=>c.text).join('').replace(/[^\p{L}\p{N}]/gu,'').toLowerCase();
    if(full && timed.length<full.length*0.9)progress.warnings++;
    for(const value of result.words as TimedWord[])progress.words.push({text:value.text,start:value.start+start,end:Math.min(value.end,end-start)+start});
   }
  }
  progress.next=index+1;
 }
 update(total,total);return progress;
}
/** Slice a generated mono PCM WAV on exact sample boundaries without decoding the video again. */
export async function sliceWav(audio:Blob,start:number,end:number):Promise<Blob> {
 const rate=16000, first=Math.round(start*rate)*2,last=Math.round(end*rate)*2;
 const header=await audio.slice(0,44).arrayBuffer();const view=new DataView(header);const length=last-first;view.setUint32(4,36+length,true);view.setUint32(40,length,true);
 return new Blob([header,audio.slice(44+first,44+last)],{type:'audio/wav'});
}
