'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import type { Locale, Role } from '../lib/messages';
const Context = createContext<{ role: Role; setRole: (r: Role) => void; locale: Locale; setLocale: (l: Locale) => void } | null>(null);
export function Preferences({ children }: { children: React.ReactNode }) {
 const [role, setRole] = useState<Role>('patient'); const [locale, setLocale] = useState<Locale>('en-IN');
 useEffect(() => { document.documentElement.lang = locale; document.documentElement.dir = 'ltr'; }, [locale]);
 return <Context.Provider value={{ role, setRole, locale, setLocale }}>{children}</Context.Provider>;
}
export function usePreferences() { const value = useContext(Context); if (!value) throw new Error('Preferences provider missing'); return value; }
