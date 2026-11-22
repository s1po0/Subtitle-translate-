/** Approximate Hawar -> Arabic Kurdish script. It changes script, not dialect.
 * Short i (bizroke) is usually unwritten; initial vowels need a carrier.
 * This simple mapping cannot disambiguate names, homographs or regional spelling. */
const letters:Record<string,string>={a:'ا',b:'ب',c:'ج','ç':'چ',d:'د',e:'ە','ê':'ێ',f:'ف',g:'گ',h:'ه',i:'','î':'ی',j:'ژ',k:'ک',l:'ل',m:'م',n:'ن',o:'ۆ',p:'پ',q:'ق',r:'ر',s:'س','ş':'ش',t:'ت',u:'و','û':'وو',v:'ڤ',w:'و',x:'خ',y:'ی',z:'ز'};
const vowels=new Set(['a','e','ê','i','î','o','u','û']);
export function transliterateWord(word:string):string {
 const chars=Array.from(word.normalize('NFC').toLowerCase());let output='';
 for(let i=0;i<chars.length;i++){
  const ch=chars[i];
  if(i===0&&vowels.has(ch))output+='ئ';
  output+=letters[ch]??ch;
 }
 return output||word;
}
/** Converts only translated text nodes, leaving HTML and protected placeholders untouched. */
export function kurmanjiHtml(output:string,input:string):string {
 const translated=new DOMParser().parseFromString(output,'text/html');
 const original=new DOMParser().parseFromString(input,'text/html');
 // Do not disguise an unchanged source-language response as Kurdish.
 if((translated.body.textContent||'').trim().toLowerCase()===(original.body.textContent||'').trim().toLowerCase())return output;
 const walker=translated.createTreeWalker(translated.body,NodeFilter.SHOW_TEXT);const nodes:Text[]=[];
 while(walker.nextNode())nodes.push(walker.currentNode as Text);
 for(const node of nodes){
  const segments=(node.nodeValue||'').split(/(ZXQ\s*\d+\s*QXZ)/gi);
  node.nodeValue=segments.map((segment,i)=>i%2?segment:segment.replace(/[A-Za-zÇçÊêÎîŞşÛû]+/g,transliterateWord)).join('');
 }
 return translated.body.innerHTML;
}
