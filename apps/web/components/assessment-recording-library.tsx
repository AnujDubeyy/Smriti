'use client';

import { useCallback, useEffect, useState } from 'react';
import { createAssessmentFile, deleteAssessmentRecording, formatRecordingTime, listAssessmentRecordings, type AssessmentRecording } from '../lib/assessment-recordings';
import styles from './assessment-recording-library.module.css';

function localDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? 'Recorded recently' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function saveFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AssessmentRecordingLibrary({ ownerId, refreshKey = 0 }: { ownerId: string; refreshKey?: number }) {
  const [recordings, setRecordings] = useState<AssessmentRecording[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const refresh = useCallback(async () => {
    try { setRecordings(await listAssessmentRecordings(ownerId)); setError(''); }
    catch { setError('This browser could not open its local recording library.'); }
  }, [ownerId]);

  useEffect(() => { void refresh(); }, [refresh, refreshKey]);

  async function exportRecording(recording: AssessmentRecording, share: boolean) {
    setBusyId(recording.id);
    try {
      const file = await createAssessmentFile(recording);
      if (share && navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Smriti assessment · ${recording.activityTitle}`, text: `Assessment recording for ${recording.patientName}` });
      } else saveFile(file);
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setError('Could not prepare the Smriti file. Try downloading it again.');
    } finally { setBusyId(''); }
  }

  async function remove(recording: AssessmentRecording) {
    if (!window.confirm(`Delete the ${recording.activityTitle} recording from this device?`)) return;
    try { await deleteAssessmentRecording(recording.id); await refresh(); }
    catch { setError('Could not delete this recording from the device.'); }
  }

  return <section className={styles.library} id="recordings" aria-labelledby="recordings-title">
    <div className={styles.heading}><div><p className={styles.eyebrow}>ON THIS DEVICE</p><h2 id="recordings-title">Assessment recordings</h2><p>Export a Smriti file to share through WhatsApp, email, or another app. The file includes audio and timestamped transcript segments.</p></div><span className={styles.count}>{recordings.length}</span></div>
    <p className={styles.privacy}>Recordings are stored in this browser on this device, not uploaded to Smriti. Clearing browser data may remove them. An exported file contains the patient’s name, audio, and transcript; share it only with the intended doctor.</p>
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    {recordings.length ? <div className={styles.list}>{recordings.map(recording => <RecordingCard key={recording.id} recording={recording} busy={busyId === recording.id} onDownload={() => void exportRecording(recording, false)} onShare={() => void exportRecording(recording, true)} onDelete={() => void remove(recording)} />)}</div>
      : <p className={styles.empty}>Recorded assessment answers will appear here.</p>}
  </section>;
}

function RecordingCard({ recording, busy, onDownload, onShare, onDelete }: { recording: AssessmentRecording; busy: boolean; onDownload: () => void; onShare: () => void; onDelete: () => void }) {
  const [audioUrl, setAudioUrl] = useState('');
  useEffect(() => {
    const url = URL.createObjectURL(recording.audio);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [recording.audio]);

  return <article className={styles.card}>
    <div className={styles.cardHead}><div><h3>{recording.activityTitle}</h3><p>{localDate(recording.recordedAt)} · {formatRecordingTime(recording.durationMs)}</p></div><button type="button" className={styles.delete} onClick={onDelete}>Delete</button></div>
    {audioUrl ? <audio className={styles.audio} controls src={audioUrl} preload="metadata" aria-label={`Listen to ${recording.activityTitle}`} /> : null}
    {recording.transcript ? <p className={styles.transcript}>{recording.transcript}</p> : <p className={styles.noTranscript}>No transcript was recognized. The recording can still be shared.</p>}
    <div className={styles.actions}><button type="button" onClick={onShare} disabled={busy}>{busy ? 'Preparing…' : 'Share file'}</button><button type="button" className={styles.secondary} onClick={onDownload} disabled={busy}>{busy ? 'Preparing…' : 'Download .smriti'}</button></div>
  </article>;
}
