'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { usePreferences } from '../app/preferences';
import { messages } from '../lib/messages';
interface InstallEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
function subscribeDisplay(callback: () => void) { const query = window.matchMedia('(display-mode: standalone)'); query.addEventListener('change', callback); return () => query.removeEventListener('change', callback); }
export function PwaControls() {
 const standalone = useSyncExternalStore(subscribeDisplay, () => window.matchMedia('(display-mode: standalone)').matches, () => false);
 const { locale } = usePreferences(); const t = messages[locale];
 const [prompt, setPrompt] = useState<InstallEvent | null>(null);
 const [status, setStatus] = useState<'idle' | 'installed' | 'dismissed' | 'unavailable'>('idle');
 const [workerError, setWorkerError] = useState(false);
 async function register() { if (!('serviceWorker' in navigator)) return; try { await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }); setWorkerError(false); } catch { setWorkerError(true); } }
 useEffect(() => {
  if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then(() => setWorkerError(false)).catch(() => setWorkerError(true)); }
  const install = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
  const installed = () => { setStatus('installed'); setPrompt(null); };
  window.addEventListener('beforeinstallprompt', install); window.addEventListener('appinstalled', installed);

  return () => { window.removeEventListener('beforeinstallprompt', install); window.removeEventListener('appinstalled', installed); };
 }, []);
 async function install() { if (!prompt) return; try { await prompt.prompt(); const choice = await prompt.userChoice; setStatus(choice.outcome === 'accepted' ? 'installed' : 'dismissed'); } catch { setStatus('unavailable'); } finally { setPrompt(null); } }
 return <details className="app-options"><summary>{t.settings}</summary><div className="options-body">
 {prompt ? <button className="button" onClick={install}>{t.install}</button> : <p>{status === 'installed' || standalone ? t.installed : t.installHelp}</p>}
 <p role="status">{status === 'dismissed' ? t.installDismissed : status === 'unavailable' ? t.installUnavailable : ''}</p>
 {workerError ? <div role="status"><p>{t.swError}</p><button className="button secondary" onClick={register}>{t.retry}</button></div> : null}
 </div></details>;
}
