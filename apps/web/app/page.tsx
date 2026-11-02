'use client';
import Link from 'next/link';
import { usePreferences } from './preferences';
import { messages, pillars } from '../lib/messages';
import { Mascot } from '../components/brand';
export default function Home() {
 const { locale } = usePreferences(); const t = messages[locale];
 return <><p className="eyebrow">{t.demo}</p><h1 tabIndex={-1}>{t.homeTitle}</h1><p className="intro">{t.homeIntro}</p>
 <div className="feature-grid">{pillars.map((p, i) => <Link href={`/${p}`} className={`feature-card ${p}`} key={p}><Mascot pillar={p} large /><h2>{t.tabs[i]}</h2><p>{t.taglines[i]}</p><span className="card-action">{t.open[i]} <span aria-hidden="true">→</span></span></Link>)}</div><p className="preview-note">{t.previewHelp}</p></>;
}
