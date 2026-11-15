import type { SessionFile } from './session';
/** Keep edits from the currently visible file when new selections are appended. */
export function appendFiles(existing:SessionFile[], activeIndex:number, current:SessionFile|null, incoming:SessionFile[]):SessionFile[] {
 return [...existing.map((file,index)=>index===activeIndex&&current?current:file),...incoming];
}
/** Remove one file, retaining current edits and selecting the nearest remaining file. */
export function removeFile(existing:SessionFile[],activeIndex:number,current:SessionFile|null,removeIndex:number):{files:SessionFile[];activeIndex:number} {
 const snapshot=existing.map((file,index)=>index===activeIndex&&current?current:file);
 if(removeIndex<0||removeIndex>=snapshot.length)return {files:snapshot,activeIndex};
 const files=snapshot.filter((_,index)=>index!==removeIndex);
 const next=removeIndex<activeIndex?activeIndex-1:removeIndex===activeIndex?Math.min(activeIndex,files.length-1):activeIndex;
 return {files,activeIndex:Math.max(0,next)};
}
