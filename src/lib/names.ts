/** Approximate English-style names in Arabic script, not translation or a pronunciation dictionary. */
const letters:Record<string,string>={a:'ا',b:'ب',c:'ک',d:'د',e:'ە',f:'ف',g:'گ',h:'ه',i:'ی',j:'ج',k:'ک',l:'ل',m:'م',n:'ن',o:'ۆ',p:'پ',q:'ق',r:'ر',s:'س',t:'ت',u:'و',v:'ڤ',w:'و',x:'کس',y:'ی',z:'ز'};
const pairs:Record<string,string>={sh:'ش',ch:'چ',th:'ث',kh:'خ',gh:'غ',ph:'ف',zh:'ژ',ee:'ی',oo:'وو',ou:'و',ie:'ی',ck:'ک'};
export function nameToKurdish(name:string):string {
 const word=name.toLowerCase();let result='';
 for(let i=0;i<word.length;i++){
  const pair=word.slice(i,i+2);
  if(pairs[pair]){result+=pairs[pair];i++;}else result+=letters[word[i]]??word[i];
 }
 return result;
}
/** Only isolated capitalized Latin words in otherwise Arabic-script provider output.
 * Preserve markup, notranslate spans, placeholders, URLs, emails and acronyms.
 * Do not change Latin text in the source, and never treat words as translations. */
export function transliterateNames(output:string,input:string):string {
 const original=new DOMParser().parseFromString(input,'text/html');
 const source=original.body.textContent||'';
 if(!/[\u0600-\u06ff]/.test(source))return output;
 const doc=new DOMParser().parseFromString(output,'text/html');
 if(!/[\u0600-\u06ff]/.test(doc.body.textContent||''))return output;
 const walker=doc.createTreeWalker(doc.body,NodeFilter.SHOW_TEXT);const nodes:Text[]=[];
 while(walker.nextNode())nodes.push(walker.currentNode as Text);
 for(const node of nodes){
  if(node.parentElement?.closest('.notranslate'))continue;
  const value=node.nodeValue||'';
  node.nodeValue=value.replace(/\S+/g,token=>{
   if(/(?:https?:|www\.|@|\/|\\|\d)/i.test(token)||/ZXQ\s*\d+\s*QXZ/i.test(token))return token;
   return token.replace(/(^|[^A-Za-z])([A-Z][a-z]{2,})(?=$|[^A-Za-z])/g,(match,prefix:string,name:string)=>{
    if(new RegExp(`\\b${name}\\b`,'i').test(source))return match;
    return prefix+nameToKurdish(name);
   });
  });
 }
 return doc.body.innerHTML;
}
