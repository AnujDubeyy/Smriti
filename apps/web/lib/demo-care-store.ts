'use client';
import {useMemo,useSyncExternalStore} from 'react';
import type {Assignment} from './assessment-activities';
export type CareLog={id:string;text:string;source:string;created_at:string};
export type DemoAssignment=Assignment&{response_text?:string;caregiver_observation?:string};
type DemoCare={assignments:DemoAssignment[];logs:CareLog[]};
const key='smriti-fictional-preview-v2';
const initial=JSON.stringify({assignments:[],logs:[
{id:'demo-log-1',text:'Ramesh enjoyed listening to old Hindi songs this morning and sang along.',source:'Caretaker · demo',created_at:'2026-11-05T03:30:00Z'},
{id:'demo-log-2',text:'We took a short walk after breakfast. He asked to rest after ten minutes.',source:'Caretaker · demo',created_at:'2026-11-05T04:00:00Z'}]} satisfies DemoCare);
let memory=initial;
function snapshot(){try{return localStorage.getItem(key)||memory;}catch{return memory;}}
function subscribe(notify:()=>void){window.addEventListener('smriti-demo-change',notify);window.addEventListener('storage',notify);return()=>{window.removeEventListener('smriti-demo-change',notify);window.removeEventListener('storage',notify);};}
export function useDemoCare(){const raw=useSyncExternalStore(subscribe,snapshot,()=>initial);return useMemo(()=>{try{return JSON.parse(raw) as DemoCare;}catch{return JSON.parse(initial) as DemoCare;}},[raw]);}
export function updateDemoCare(update:(value:DemoCare)=>DemoCare){let value:DemoCare;try{value=JSON.parse(snapshot());}catch{value=JSON.parse(initial);}memory=JSON.stringify(update(value));try{localStorage.setItem(key,memory);}catch{/* Keeps working in memory if storage is unavailable. */}window.dispatchEvent(new Event('smriti-demo-change'));}
export function demoId(){return 'demo-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);}
