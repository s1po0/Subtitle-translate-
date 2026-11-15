import type { SessionFile } from './session';
/** Keep edits from the currently visible file when new selections are appended. */
export function appendFiles(existing:SessionFile[], activeIndex:number, current:SessionFile|null, incoming:SessionFile[]):SessionFile[] {
 return [...existing.map((file,index)=>index===activeIndex&&current?current:file),...incoming];
}
