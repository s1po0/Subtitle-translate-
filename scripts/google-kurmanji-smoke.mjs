// Synthetic sentences only; tests Google Kurmanji and placeholder survival, not dialect quality.
const texts=['Hello, how are you?','Hello <span class="notranslate">ZXQ0QXZ</span>, welcome.'];
const response=await fetch('https://translate-pa.googleapis.com/v1/translateHtml',{
 method:'POST',headers:{'Content-Type':'application/json+protobuf','X-Goog-API-Key':'AIzaSyATBXajvzQLTDHEQbcpq0Ihe0vWDHmO520'},
 body:JSON.stringify([[texts,'en','ku'],'te_lib']),signal:AbortSignal.timeout(30000)
});
if(!response.ok)throw new Error(`Google Kurmanji HTTP ${response.status}`);
const data=await response.json();const out=data?.[0];
if(!Array.isArray(out)||out.length!==2||out.some(x=>typeof x!=='string'||!x.trim()))throw new Error('Incomplete Kurmanji response');
if(!out[1].includes('ZXQ0QXZ'))throw new Error('Protected marker lost');
if(out[0].trim().toLowerCase()===texts[0].toLowerCase())throw new Error('Kurmanji sample unchanged');
console.log('Google Kurmanji live smoke: translations and protected marker returned; linguistic quality not assessed.');
