'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatRecordingTime, parseAssessmentFile, type AssessmentRecording } from '../lib/assessment-recordings';
import styles from './doctor-recording-import.module.css';

function dateText(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? 'Unknown date' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function DoctorRecordingImport() {
  const input = useRef<HTMLInputElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const [recording, setRecording] = useState<AssessmentRecording | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [currentMs, setCurrentMs] = useState(0);
  const [error, setError] = useState('');
  const segments = useMemo(() => recording?.segments.length ? recording.segments : recording?.transcript ? [{ startMs: 0, durationMs: recording.durationMs, text: recording.transcript }] : [], [recording]);
  const activeIndex = segments.reduce((active, segment, index) => segment.startMs <= currentMs ? index : active, -1);

  useEffect(() => {
    if (!recording) { setAudioUrl(''); return; }
    const url = URL.createObjectURL(recording.audio);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [recording]);

  async function importFile(file?: File) {
    if (!file) return;
    setError('');
    try {
      const next = await parseAssessmentFile(file);
      setRecording(next);
      setCurrentMs(0);
    } catch (reason) {
      setRecording(null);
      setError(reason instanceof Error ? reason.message : 'Could not open this Smriti file.');
    } finally {
      if (input.current) input.current.value = '';
    }
  }

  return <section className={styles.importer} aria-labelledby="import-recording-title">
    <div className={styles.intro}><div><p className={styles.eyebrow}>PATIENT-SHARED FILE</p><h2 id="import-recording-title">Import an assessment recording</h2><p>Open a <code>.smriti</code> file the patient shared with you. It stays in this browser and is not uploaded.</p></div>
      <button type="button" className={styles.importButton} onClick={() => input.current?.click()}>Choose .smriti file</button>
      <input ref={input} className={styles.fileInput} type="file" accept=".smriti,application/vnd.smriti.assessment" onChange={event => void importFile(event.target.files?.[0])} />
    </div>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {recording ? <div className={styles.player}>
      <div className={styles.fileHeading}><div><h3>{recording.patientName} · {recording.activityTitle}</h3><p>{dateText(recording.recordedAt)} · {recording.locale}</p></div><button type="button" className={styles.clear} onClick={() => { setRecording(null); setCurrentMs(0); }}>Close file</button></div>
      {audioUrl ? <audio ref={audio} controls src={audioUrl} preload="metadata" onTimeUpdate={event => setCurrentMs(event.currentTarget.currentTime * 1000)} aria-label="Imported patient assessment recording" /> : null}
      <p className={styles.syncNote}>Times mark Gnani’s recognized speech segments and may be approximate. Select a line to jump to it, then verify against the audio.</p>
      {segments.length ? <ol className={styles.transcript}>{segments.map((segment, index) => <li key={`${segment.startMs}-${index}`} className={index === activeIndex ? styles.active : undefined}>
        <button type="button" onClick={() => { if (audio.current) { audio.current.currentTime = segment.startMs / 1000; void audio.current.play(); } }}><time>{formatRecordingTime(segment.startMs)}</time><span>{segment.text}</span></button>
      </li>)}</ol> : <p className={styles.noTranscript}>No transcript was included. You can still listen to the recording above.</p>}
    </div> : null}
  </section>;
}
