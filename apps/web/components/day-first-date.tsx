'use client';
import {useState} from 'react';

export function displayDate(iso:string){return iso.split('-').reverse().join('/');}

export function DayFirstDate({value,onChange,required=false,min,max}:{value:string;onChange:(iso:string)=>void;required?:boolean;min?:string;max?:string}){
 const [draft,setDraft]=useState(displayDate(value));
 return <input type="text" placeholder="dd/mm/yyyy" maxLength={10} required={required}
  pattern="[0-9]{2}/[0-9]{2}/[0-9]{4}" value={draft} onChange={event=>{
   const input=event.currentTarget;
   const digits=input.value.replace(/\D/g,'').slice(0,8);
   const formatted=[digits.slice(0,2),digits.slice(2,4),digits.slice(4)].filter(Boolean).join('/');
   const iso=formatted.split('/').reverse().join('-');
   const date=new Date(iso+'T00:00:00Z');
   const valid=digits.length===8&&Number.isFinite(date.valueOf())&&date.toISOString().startsWith(iso+'T')&&(!min||iso>=min)&&(!max||iso<=max);
   input.setCustomValidity(formatted&&!valid?'Enter a valid date in dd/mm/yyyy format within the allowed range.':'');
   setDraft(formatted);onChange(valid?iso:formatted?'invalid':'');
  }}/>;
}
