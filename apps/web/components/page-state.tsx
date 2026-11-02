'use client';
import Link from 'next/link';
import { usePreferences } from '../app/preferences';
import { messages } from '../lib/messages';
export function PageState({ kind, retry }: { kind: 'loading' | 'error' | 'not-found'; retry?: () => void }) {
 const { locale } = usePreferences(); const t = messages[locale];
 if (kind === 'loading') return <div className="state-panel" role="status" aria-busy="true"><p>{t.loading}</p></div>;
 return <section className="state-panel"><h1 tabIndex={-1}>{kind === 'error' ? t.errorTitle : t.notFound}</h1><p>{kind === 'error' ? t.errorBody : t.notFoundBody}</p><div className="actions">{retry ? <button className="button" onClick={retry}>{t.retry}</button> : null}<Link href="/" className="button secondary">{t.returnHome}</Link></div></section>;
}
