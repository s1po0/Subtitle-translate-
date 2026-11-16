import type { CaptionProgress } from './captions';
export interface CaptionCheckpoint {version:2;fingerprint:string;duration:number;progress:CaptionProgress}
let database:Promise<IDBDatabase>|undefined;
function db():Promise<IDBDatabase>{return database ||= new Promise((resolve,reject)=>{const r=indexedDB.open('rizhnus-video-checkpoint',1);r.onupgradeneeded=()=>r.result.createObjectStore('jobs');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function loadCheckpoint(fingerprint:string,duration:number):Promise<CaptionProgress|undefined>{
 try{const d=await db();const checkpoint=await new Promise<CaptionCheckpoint|undefined>((resolve,reject)=>{const r=d.transaction('jobs').objectStore('jobs').get('current');r.onsuccess=()=>resolve(r.result as CaptionCheckpoint|undefined);r.onerror=()=>reject(r.error);});
 if(checkpoint?.version!==2||checkpoint.fingerprint!==fingerprint||Math.abs(checkpoint.duration-duration)>0.05)return undefined;
 const p=checkpoint.progress;if(!p||!Number.isInteger(p.next)||p.next<0||p.next>Math.ceil(duration/116)||!Array.isArray(p.words)||!Number.isInteger(p.warnings)||p.warnings<0)return undefined;
 return p;
 }catch{return undefined;}
}
export async function saveCheckpoint(value:CaptionCheckpoint):Promise<boolean>{try{const d=await db();await new Promise<void>((resolve,reject)=>{const tx=d.transaction('jobs','readwrite');tx.objectStore('jobs').put(value,'current');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});return true;}catch{return false;}}
export async function clearCheckpoint():Promise<boolean>{try{const d=await db();await new Promise<void>((resolve,reject)=>{const tx=d.transaction('jobs','readwrite');tx.objectStore('jobs').delete('current');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});return true;}catch{return false;}}
