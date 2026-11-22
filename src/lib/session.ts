import type { Format, Subtitle } from './subtitles';
export type SessionRow = {text:string;status:'pending'|'done'|'failed'|'edited';error?:string};
export type SessionFile = {doc:Subtitle;name:string;encoding:string;rows:SessionRow[];output:Format;detected:string};
export type Session = {files:SessionFile[];activeFile:number;target?:'ckb'|'ku'};
let dbPromise:Promise<IDBDatabase>|undefined;
function open():Promise<IDBDatabase>{return dbPromise ||= new Promise((resolve,reject)=>{const request=indexedDB.open('rizhnus-session',1);request.onupgradeneeded=()=>request.result.createObjectStore('sessions');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
export async function loadSession():Promise<Session|undefined>{try{const db=await open();return await new Promise((resolve,reject)=>{const req=db.transaction('sessions').objectStore('sessions').get('current');req.onsuccess=()=>resolve(req.result as Session|undefined);req.onerror=()=>reject(req.error);});}catch{return undefined;}}
export async function saveSession(value:Session):Promise<void>{try{const db=await open();await new Promise<void>((resolve,reject)=>{const tx=db.transaction('sessions','readwrite');tx.objectStore('sessions').put(value,'current');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}catch{/* Storage may be disabled or full. */}}
