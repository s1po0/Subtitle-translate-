import type { Cue } from './subtitles';

/** Pair only obvious English continuations: never combine speakers, sound cues,
 * markup, distant cues or other scripts. This is a heuristic, not semantic QA. */
export function canJoinContinuation(a:Cue,b:Cue,source:string,glossary:string[]):boolean {
 if(source!=='en'&&source!=='auto')return false;
 const first=a.text.trim(),second=b.text.trim();
 if((first+' '+second).toUpperCase().includes('RIZHBOUNDARYTOKEN'))return false;
 if(!first||!second||first.length+second.length>220||!/[a-z]/.test(first)||!/^[a-z]/.test(second))return false;
 if(!/^[A-Za-z0-9 ,']+$/.test(first)||!/^[A-Za-z0-9 ,'.!?]+$/.test(second))return false;
 if(!/[A-Za-z0-9]$/.test(first)||first.split(/\s+/).length<2)return false;
 if(glossary.some(term=>term&&(`${first} ${second}`).toLowerCase().includes(term.toLowerCase())))return false;
 const seconds=(stamp:string)=>{const parts=stamp.replace(',','.').split(':').map(Number);return parts.length===3?parts[0]*3600+parts[1]*60+parts[2]:NaN;};
 const end=seconds(a.end),start=seconds(b.start),gap=start-end;
 return Number.isFinite(gap)&&gap>=-0.1&&gap<=1.5;
}
