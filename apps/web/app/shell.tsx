'use client';
import { usePathname } from 'next/navigation';
import { usePreferences } from './preferences';
import { messages, pillars, roles } from '../lib/messages';
import { Mascot } from '../components/brand';
export default function Shell() {
 const path = usePathname(); const index = Math.max(0, pillars.findIndex(p => path === `/${p}`)); const pillar = pillars[index];
 const { role, locale } = usePreferences(); const t = messages[locale];
 return <><p className="eyebrow">{t.demo} · {t.roles[roles.indexOf(role)]}</p><h1 tabIndex={-1}>{t.tabs[index]}</h1>
 <section className={`empty-state ${pillar}`} aria-labelledby="empty-heading"><Mascot pillar={pillar} large /><div><p className="status-label">{t.notConfigured}</p><h2 id="empty-heading">{t.titles[roles.indexOf(role)][index]}</h2><p id="unavailable-reason">{t.descriptions[index]}</p><button className={`button ${pillar}`} disabled aria-describedby="unavailable-reason">{t.actions[index]}</button></div></section><p className="preview-note">{t.roleNotes[roles.indexOf(role)]}</p></>;
}
