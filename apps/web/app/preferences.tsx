"use client";
import {createContext,useContext,useEffect,useState} from 'react';
import type {Locale} from '../lib/messages';
type Role = 'patient'|'caregiver'|'clinician';
const Context=createContext<{role:Role;setRole:(r:Role)=>void;locale:Locale;setLocale:(l:Locale)=>void}|null>(null);
export function Preferences({children}:{children:React.ReactNode}) {
 const [role,setRole]=useState<Role>('patient');
 const [locale,setLocale]=useState<Locale>('en');
 useEffect(()=>{document.documentElement.lang=locale;},[locale]);
 return <Context.Provider value={{role,setRole,locale,setLocale}}>{children}</Context.Provider>;
}
export function usePreferences(){const value=useContext(Context);if(!value)throw new Error('Preferences provider missing');return value;}
