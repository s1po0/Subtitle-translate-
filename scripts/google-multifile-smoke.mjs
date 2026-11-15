// Synthetic text only: 13 files of 32 unique cues, sequential requests.
const start=Date.now();let completed=0;
try {
 for(let file=0;file<13;file++){
  const texts=Array.from({length:32},(_,cue)=>`This is sample dialogue ${file+1} number ${cue+1}.`);
  const response=await fetch('https://translate-pa.googleapis.com/v1/translateHtml',{method:'POST',headers:{'Content-Type':'application/json+protobuf','X-Goog-API-Key':'AIzaSyATBXajvzQLTDHEQbcpq0Ihe0vWDHmO520'},body:JSON.stringify([[texts,'en','ckb'],'te_lib']),signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const body=await response.json();
  if(!Array.isArray(body[0])||body[0].length!==32||body[0].some(t=>typeof t!=='string'||!t.trim()||!/[\u0600-\u06ff]/.test(t)))throw new Error('Incomplete or non-Sorani-script response');
  completed++;
 }
 console.log(`::notice title=Live Google benchmark::${completed} synthetic files, 416 cues, ${(Date.now()-start)/1000} seconds. GitHub runner; Android and user network not measured.`);
} catch(e){console.log(`::warning title=Live Google benchmark::Stopped after ${completed} files: ${e instanceof Error?e.message:'unknown error'}`);process.exitCode=1;}
