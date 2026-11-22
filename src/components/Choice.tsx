import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

type ChoiceProps={value:string;options:readonly (readonly [string,string])[];onChange:(value:string)=>void;label:string;disabled?:boolean};
/** In-app choices avoid OEM WebView native select dialogs with unreadable themes. */
export function Choice({value,options,onChange,label,disabled}:ChoiceProps){
 const [open,setOpen]=useState(false);const trigger=useRef<HTMLButtonElement>(null);const dialog=useRef<HTMLDivElement>(null);const selected=useRef<HTMLButtonElement>(null);const id=useId();
 useEffect(()=>{if(!open)return;selected.current?.focus();const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);trigger.current?.focus();return;}if(event.key==='Tab'){const items=dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');if(!items?.length)return;const first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}};document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey);},[open]);
 const close=()=>{setOpen(false);trigger.current?.focus();};
 return <><button ref={trigger} type="button" className="choice-trigger" aria-label={label} aria-haspopup="dialog" aria-expanded={open} disabled={disabled} onClick={()=>setOpen(true)}><span>{options.find(option=>option[0]===value)?.[1]||value}</span><ChevronDown size={16}/></button>
 {open&&<div className="choice-overlay" onClick={close}><div ref={dialog} className="choice-dialog" role="dialog" aria-modal="true" aria-labelledby={id} onClick={event=>event.stopPropagation()}><div className="choice-header"><strong id={id}>{label}</strong><button type="button" className="choice-close" aria-label="داخستن" onClick={close}><X size={20}/></button></div><div className="choice-options">{options.map(([code,text])=><button ref={code===value?selected:undefined} type="button" key={code} className={'choice-option'+(code===value?' selected':'')} onClick={()=>{onChange(code);close();}}><span>{text}</span>{code===value&&<Check size={18}/>}</button>)}</div></div></div>}</>;
}
