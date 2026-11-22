import type { Cue } from './subtitles';
import { duration } from './subtitles';
import type { SessionRow } from './session';

/** Export falls back to the original when the translated text is empty. */
export function isIncomplete(cue:Cue,row:SessionRow):boolean {
 return row.status==='pending'||row.status==='failed'||(Boolean(cue.text.trim())&&!row.text.trim());
}
/** Conservative review hints, not a judgment of translation quality. */
export function reviewHints(cue:Cue,row:SessionRow):{unchanged:boolean;fast:boolean;short:boolean;long:boolean} {
 if(row.status!=='done'&&row.status!=='edited')return {unchanged:false,fast:false,short:false,long:false};
 const strip=(text:string)=>text.replace(/<[^>]*>|\{\\[^}]*\}|\\[Nnh]|\[|\]|♪/g,' ').replace(/\s+/g,' ').trim();
 const source=strip(cue.text),translated=strip(row.text);
 const unchanged=Boolean(translated)&&/[a-zA-Z]/.test(source)&&source.toLocaleLowerCase()===translated.toLocaleLowerCase();
 const seconds=duration(cue);const fast=seconds>0&&Array.from(translated).length/seconds>20;
 return {unchanged,fast,short:seconds>0&&seconds<0.83,long:seconds>7};
}
export function fileSummary(cues:Cue[],rows:SessionRow[]):{complete:number;failed:number;total:number} {
 return {complete:cues.filter((cue,i)=>!isIncomplete(cue,rows[i])).length,failed:rows.filter(row=>row.status==='failed').length,total:cues.length};
}
