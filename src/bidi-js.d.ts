declare module 'bidi-js' {
 export default function bidiFactory(): {
  getEmbeddingLevels(text:string,direction?:'ltr'|'rtl'):unknown;
  getReorderedString(text:string,levels:unknown):string;
 };
}
