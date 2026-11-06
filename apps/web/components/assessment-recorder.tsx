'use client';

import { useEffect, useRef, useState } from 'react';
import { encodeWav } from '../lib/voice/audio';
import type { TranscriptSegment } from '../lib/assessment-recordings';
import styles from './assessment-recorder.module.css';

export type RecorderState = 'idle' | 'starting' | 'recording' | 'transcribing';

function MicrophoneIcon({ stop = false }: { stop?: boolean }) {
  return stop ? (
    <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3m-4 0h8" /></svg>
  );
}

type Props = {
  patientId: string;
  locale: string;
  preview: boolean;
  maxDurationMs?: number;
  onText: (text: string) => void;
  onRecording: (recording: { audio: Blob; durationMs: number; mimeType: string; transcript: string; segments: TranscriptSegment[] }) => Promise<void>;
  onBusy: (value: boolean) => void;
  onState: (value: RecorderState) => void;
};

export function AssessmentRecorder({ patientId, locale, preview, maxDurationMs = 65000, onText, onRecording, onBusy, onState }: Props) {
  const [state, setState] = useState<RecorderState>('idle');
  const [notice, setNotice] = useState('');
  const [playback, setPlayback] = useState('');
  const recording = useRef<MediaRecorder | null>(null);
  const lifecycle = useRef<AbortController | null>(null);
  const microphone = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const session = useRef('');
  const socket = useRef<WebSocket | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const audioSource = useRef<MediaStreamAudioSourceNode | null>(null);
  const worklet = useRef<AudioWorkletNode | null>(null);
  const latestLiveText = useRef('');
  const transcriptSegments = useRef<TranscriptSegment[]>([]);
  const recordingStartedAt = useRef(0);
  const recordingStartedPerf = useRef(0);

  function updateState(value: RecorderState) {
    setState(value);
    onState(value);
  }

  function stopSession() {
    const id = session.current;
    session.current = '';
    if (id) void fetch('/api/v1/voice/stop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: id }), keepalive: true }).catch(() => {});
  }

  function stopStreaming() {
    worklet.current?.disconnect();
    audioSource.current?.disconnect();
    worklet.current = null;
    audioSource.current = null;
    const activeSocket = socket.current;
    socket.current = null;
    if (activeSocket && activeSocket.readyState < WebSocket.CLOSING) activeSocket.close();
    const context = audioContext.current;
    audioContext.current = null;
    if (context && context.state !== 'closed') void context.close();
  }

  useEffect(() => () => {
    lifecycle.current?.abort();
    clearTimeout(timer.current);
    if (recording.current?.state === 'recording') recording.current.stop();
    stopStreaming();
    microphone.current?.getTracks().forEach(track => track.stop());
    stopSession();
  }, []);

  useEffect(() => () => { if (playback) URL.revokeObjectURL(playback); }, [playback]);

  async function connectLiveTranscription(stream: MediaStream, signal: AbortSignal) {
    if (!session.current || !navigator.mediaDevices?.getUserMedia) return false;
    try {
      const ticketResponse = await fetch('/api/v1/voice/realtime-ticket', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.current }), signal,
      });
      const ticketData = await ticketResponse.json();
      if (!ticketResponse.ok || !ticketData.ticket || !ticketData.url) return false;

      const context = new AudioContext();
      audioContext.current = context;
      await context.audioWorklet.addModule('/voice/pcm-worklet.js');
      if (signal.aborted) return false;
      const source = context.createMediaStreamSource(stream);
      const processor = new AudioWorkletNode(context, 'smriti-pcm-frame-processor');
      audioSource.current = source;
      worklet.current = processor;
      processor.port.onmessage = event => {
        const activeSocket = socket.current;
        if (activeSocket?.readyState === WebSocket.OPEN) activeSocket.send(event.data);
      };
      const liveSocket = new WebSocket(ticketData.url, ['smriti.v1', `ticket.${ticketData.ticket}`]);
      liveSocket.binaryType = 'arraybuffer';
      socket.current = liveSocket;
      liveSocket.onmessage = event => {
        try {
          const message = JSON.parse(String(event.data));
          if (message.type !== 'transcript' || typeof message.text !== 'string' || !message.text.trim()) return;
          const text = message.text.trim();
          const index = Number.isInteger(message.segment_index) ? Number(message.segment_index) : null;
          const existingIndex = index === null ? -1 : transcriptSegments.current.findIndex(segment => segment.segmentIndex === index);
          if (existingIndex >= 0) {
            transcriptSegments.current[existingIndex] = { ...transcriptSegments.current[existingIndex], text };
          } else {
            const previous = latestLiveText.current;
            const cumulative = text.startsWith(previous) || previous.startsWith(text);
            const segmentText = cumulative && previous ? text.slice(previous.length).trim() : text;
            if (segmentText) {
              const last = transcriptSegments.current[transcriptSegments.current.length - 1];
              const durationMs = Number.isFinite(message.audio_duration_ms) ? Math.max(0, Number(message.audio_duration_ms)) : 0;
              const cumulativeStart = last ? last.startMs + last.durationMs : 0;
              const latencyMs = Number.isFinite(message.latency_ms) ? Math.max(0, Number(message.latency_ms)) : 0;
              const estimatedStart = performance.now() - recordingStartedPerf.current - latencyMs - durationMs;
              const startMs = Math.max(0, cumulativeStart, estimatedStart);
              const segment: TranscriptSegment = { startMs, durationMs, text: segmentText, ...(index === null ? {} : { segmentIndex: index }) };
              transcriptSegments.current.push(segment);
            }
          }
          latestLiveText.current = transcriptSegments.current.map(segment => segment.text).join(' ').trim() || text;
          onText(latestLiveText.current);
        } catch { /* Ignore malformed gateway frames; final REST transcription remains available. */ }
      };
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Live speech recognition timed out.')), 5000);
        liveSocket.onopen = () => { clearTimeout(timeout); resolve(); };
        liveSocket.onerror = () => { clearTimeout(timeout); reject(new Error('Live speech recognition is unavailable.')); };
        liveSocket.onclose = () => { clearTimeout(timeout); };
        signal.addEventListener('abort', () => { clearTimeout(timeout); reject(new DOMException('Recording cancelled.', 'AbortError')); }, { once: true });
      });
      if (signal.aborted) return false;
      source.connect(processor);
      processor.connect(context.destination);
      return true;
    } catch {
      stopStreaming();
      return false;
    }
  }

  async function transcribeFinal(blob: Blob, signal: AbortSignal) {
    let context: AudioContext | undefined;
    try {
      context = new AudioContext();
      const audio = await context.decodeAudioData(await blob.arrayBuffer());
      const samples = audio.getChannelData(0);
      const words: string[] = [];
      for (let i = 0; i < samples.length; i += audio.sampleRate * 28) {
        const chunk = samples.subarray(i, i + audio.sampleRate * 28);
        if (chunk.length < audio.sampleRate / 10) break;
        const response = await fetch('/api/v1/voice/assessment_transcribe', {
          method: 'POST', headers: { 'Content-Type': 'audio/wav', 'x-session-id': session.current, 'x-turn-id': crypto.randomUUID() },
          body: encodeWav(chunk, audio.sampleRate) as BodyInit, signal,
        });
        const data = await response.json();
        if (!response.ok || !data.textRaw?.trim()) throw new Error(data.error === 'voice_not_configured' ? 'Automatic speech recognition is not configured yet. Your recording is saved on this device.' : 'Automatic transcription could not complete. Your recording is saved on this device; record again or enter the words manually.');
        words.push(data.textRaw.trim());
      }
      return words.join(' ').trim();
    } finally {
      if (context) void context.close();
    }
  }

  function stopCapture() {
    if (recording.current?.state !== 'recording') return;
    clearTimeout(timer.current);
    updateState('transcribing');
    recording.current.stop();
  }

  async function start() {
    const controller = new AbortController();
    lifecycle.current = controller;
    const { signal } = controller;
    updateState('starting');
    onBusy(true);
    setNotice('');
    setPlayback('');
    latestLiveText.current = '';
    transcriptSegments.current = [];
    recordingStartedAt.current = 0;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('This browser cannot record audio. Type the response below.');
      if (!preview) {
        const response = await fetch('/api/v1/voice/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patient_id: patientId, locale }), signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error === 'consent_required' ? 'Allow microphone processing in Care permissions before recording.' : 'Voice service unavailable. You can type the response below.');
        session.current = data.id;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (signal.aborted) { stream.getTracks().forEach(track => track.stop()); return; }
      microphone.current = stream;
      if (!preview) {
        const live = await connectLiveTranscription(stream, signal);
        setNotice(live ? 'Live transcript is updating as the patient speaks.' : 'Live transcription is unavailable. The recording will be transcribed when stopped.');
      }
      const recorder = new MediaRecorder(stream);
      recording.current = recorder;
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = async () => {
        clearTimeout(timer.current);
        const durationMs = Math.max(0, Date.now() - recordingStartedAt.current);
        if (!preview && !signal.aborted && socket.current?.readyState === WebSocket.OPEN) {
          updateState('transcribing');
          await new Promise(resolve => window.setTimeout(resolve, 850));
        }
        stopStreaming();
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (!signal.aborted) setPlayback(URL.createObjectURL(blob));
        if (signal.aborted) {
          try { await onRecording({ audio: blob, durationMs, mimeType: blob.type || 'audio/webm', transcript: latestLiveText.current, segments: [...transcriptSegments.current] }); } catch { /* Preserve the recording if the local database is still available. */ }
          return;
        }
        if (preview) {
          setNotice('Local preview recording. Gnani transcription is available after sign-in.');
          try { await onRecording({ audio: blob, durationMs, mimeType: blob.type || 'audio/webm', transcript: latestLiveText.current, segments: [...transcriptSegments.current] }); }
          catch { setNotice('The recording could not be saved to this device. Check browser storage and try again.'); }
          updateState('idle'); onBusy(false); return;
        }
        updateState('transcribing');
        let finalText = latestLiveText.current;
        try {
          const correctedText = await transcribeFinal(blob, signal);
          if (!signal.aborted && correctedText) {
            finalText = correctedText;
            onText(correctedText);
            setNotice('Transcript ready. Listen back and correct it before saving.');
          } else if (!signal.aborted && finalText) {
            onText(finalText);
            setNotice('Showing the live transcript. Listen back and correct it before saving.');
          } else if (!signal.aborted) {
            setNotice('No speech was recognized automatically. The recording is saved; try again or enter the response manually.');
          }
        } catch (error) {
          if (!signal.aborted) {
            if (finalText) {
              onText(finalText);
              setNotice('Final recognition failed. Showing the live transcript; review it before saving.');
            } else setNotice(error instanceof Error ? error.message : 'Automatic transcription failed. Try recording again or enter the words manually.');
          }
        }
        try {
          if (!signal.aborted) await onRecording({ audio: blob, durationMs, mimeType: blob.type || 'audio/webm', transcript: finalText, segments: [...transcriptSegments.current] });
        } catch {
          if (!signal.aborted) setNotice('The recording could not be saved to this device. Check browser storage and try again.');
        } finally {
          stopSession();
          if (!signal.aborted) { updateState('idle'); onBusy(false); }
        }
      };
      recorder.start();
      recordingStartedAt.current = Date.now();
      recordingStartedPerf.current = performance.now();
      updateState('recording');
      timer.current = setTimeout(stopCapture, maxDurationMs);
    } catch (error) {
      stopStreaming();
      microphone.current?.getTracks().forEach(track => track.stop());
      stopSession();
      if (!signal.aborted) {
        updateState('idle'); onBusy(false);
        setNotice(error instanceof DOMException ? 'Microphone unavailable. Check browser permission or type the response below.' : error instanceof Error ? error.message : 'Could not start recording.');
      }
    }
  }

  const status = state === 'recording' ? 'Recording · tap stop when finished' : state === 'starting' ? 'Requesting microphone access…' : state === 'transcribing' ? 'Recognizing speech automatically…' : '';
  return <div className={styles.root}>
    <div className={styles.controlRow}>
      <div className={styles.recordStatus} aria-live="polite"><span className={state === 'recording' ? styles.liveDot : styles.idleDot} /><div><strong>{state === 'recording' ? 'Listening…' : state === 'transcribing' ? 'Preparing transcript…' : 'Ready to record'}</strong><span>{state === 'recording' ? 'The patient can speak now.' : state === 'transcribing' ? 'Gnani first, with automatic Groq fallback.' : 'Speech is transcribed automatically.'}</span></div></div>
      <button type="button" className={state === 'recording' ? styles.stop : styles.record} aria-label={state === 'recording' ? 'Stop recording and transcribe' : 'Record spoken answer'} aria-pressed={state === 'recording'} disabled={state === 'starting' || state === 'transcribing'} onClick={() => state === 'recording' ? stopCapture() : void start()}>
        <MicrophoneIcon stop={state === 'recording'} /><span>{state === 'recording' ? 'Stop' : 'Record answer'}</span>
      </button>
    </div>
    {status ? <p role="status" className={styles.stateMessage}>{status}</p> : null}
    {playback ? <div className={styles.playback}><span>Replay your recording</span><audio controls src={playback} aria-label="Recorded patient answer" preload="metadata" /></div> : null}
    {notice ? <p role="status" className={styles.notice}>{notice}</p> : null}
  </div>;
}
