// Live integration probe with synthetic text only; never sends user files.
const texts=Array.from({length:32},(_,i)=>`Hello friend number ${i+1}.`);
texts[0]='Hello <span class="notranslate">ZXQ0QXZ</span> friend.';
texts[2]='I thought that <span class="notranslate">ZXQ0QXZ</span> you were coming.';
texts[1]='<span class="notranslate">ZXQ0QXZ</span>Music plays<span class="notranslate">ZXQ1QXZ</span>';

const response=await fetch('https://translate-pa.googleapis.com/v1/translateHtml',{
 method:'POST',headers:{'Content-Type':'application/json+protobuf','X-Goog-API-Key':'AIzaSyATBXajvzQLTDHEQbcpq0Ihe0vWDHmO520'},
 body:JSON.stringify([[texts,'en','ckb'],'te_lib']),signal:AbortSignal.timeout(30000)
});
if(!response.ok)throw new Error(`Google HTTP ${response.status}`);
const result=await response.json();
if(!Array.isArray(result[0])||result[0].length!==texts.length||result[0].some(x=>typeof x!=='string'||!x.trim()))throw new Error('Incomplete batch response');
if(!result[0][0].includes('ZXQ0QXZ'))throw new Error('Protected marker lost');
const bracket=result[0][1].replace(/<[^>]+>/g,'');const left=bracket.indexOf('ZXQ0QXZ'),right=bracket.indexOf('ZXQ1QXZ');
if(left<0||right<=left||!/[\u0600-\u06ff]/.test(bracket.slice(left+7,right)))throw new Error('Bracketed text did not translate safely');
if(!result[0].some(x=>/[\u0600-\u06ff]/.test(x)))throw new Error('No Arabic-script output');
console.log('Google widget live batch: 32 translations returned, ckb script and marker present.');

const joined=result[0][2].replace(/<[^>]+>/g,'');const marker=joined.indexOf('ZXQ0QXZ');console.log('Context boundary probe:',marker>0 && marker+7<joined.length && /[\u0600-\u06ff]/.test(joined.slice(0,marker)) && /[\u0600-\u06ff]/.test(joined.slice(marker+7))?'marker retained with text on both sides':'boundary unusable; app falls back to independent cues');
