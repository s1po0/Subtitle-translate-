let dbPromise:Promise<IDBDatabase>|undefined;
function db():Promise<IDBDatabase> { return dbPromise ||= new Promise((resolve,reject)=>{const request=indexedDB.open('rizhnus-cache',1); request.onupgradeneeded=()=>request.result.createObjectStore('translations'); request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error);}); }
export async function getCached(key:string):Promise<string|undefined> {try {const d=await db(); return await new Promise((resolve,reject)=>{const r=d.transaction('translations').objectStore('translations').get(key); r.onsuccess=()=>resolve(r.result as string|undefined); r.onerror=()=>reject(r.error);});}catch{return undefined;}}
export async function setCached(key:string,value:string):Promise<void> {try {const d=await db(); await new Promise<void>((resolve,reject)=>{const tx=d.transaction('translations','readwrite');tx.objectStore('translations').put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}catch { /* Cache is optional. */ }}
/** Read and write a batch in a single IndexedDB transaction rather than one per cue. */
export async function getCachedBatch(keys:string[]):Promise<(string|undefined)[]> {
 try {const d=await db();return await new Promise((resolve,reject)=>{const tx=d.transaction('translations','readonly');const store=tx.objectStore('translations');const values:(string|undefined)[]=new Array(keys.length);keys.forEach((key,i)=>{const request=store.get(key);request.onsuccess=()=>{values[i]=request.result as string|undefined;};});tx.oncomplete=()=>resolve(values);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}catch{return keys.map(()=>undefined);}
}
export async function setCachedBatch(entries:{key:string;value:string}[]):Promise<void> {
 if(!entries.length)return;
 try {const d=await db();await new Promise<void>((resolve,reject)=>{const tx=d.transaction('translations','readwrite');const store=tx.objectStore('translations');for(const {key,value} of entries)store.put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}catch{/* Cache is optional. */}
}
