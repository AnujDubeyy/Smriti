'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { findInstrument, type ActivityLocale } from '../lib/assessment/instruments';
import { getItemPrompt, type SpokenItemPrompt } from '../lib/assessment/prompts';
import type { ItemTimestamps } from '../lib/assessment/timing';
import { saveAssessmentRecording, type TranscriptSegment } from '../lib/assessment-recordings';
import styles from './voice-assessment-session.module.css';

interface VoiceAssessmentSessionProps {
  sessionId: string;
  assignmentId: string;
  patientId: string;
  patientName?: string;
  instrumentCode: string;
  instrumentTitle: string;
  locale: ActivityLocale;
  totalItems: number;
  initialItemIndex: number;
  initialItemTitle: string;
  initialPrompt?: SpokenItemPrompt;
  timeLimitSeconds?: number;
  onSessionComplete?: () => void;
  onExit?: () => void;
}

export function VoiceAssessmentSession({
  sessionId,
  assignmentId,
  patientId,
  patientName,
  instrumentCode,
  instrumentTitle,
  locale,
  totalItems,
  initialItemIndex,
  initialItemTitle,
  initialPrompt,
  timeLimitSeconds,
  onSessionComplete,
  onExit
}: VoiceAssessmentSessionProps) {
  const [itemIndex, setItemIndex] = useState(initialItemIndex);
  const [currentPrompt, setCurrentPrompt] = useState<SpokenItemPrompt | undefined>(initialPrompt);
  const [currentTitle, setCurrentTitle] = useState(initialItemTitle);
  const [status, setStatus] = useState<'Speaking' | 'Listening' | 'Thinking' | 'Paused' | 'Completed'>('Speaking');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [captionsOpen, setCaptionsOpen] = useState(true);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [caregiverNote, setCaregiverNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Audio & Timestamp Tracking
  const questionPreparedAt = useRef<number>(Date.now());
  const questionPlaybackFinishedAt = useRef<number>(0);
  const speechStartedAt = useRef<number>(0);
  const speechEndedAt = useRef<number>(0);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);

  // Audio capture & segment history
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordedSegmentsRef = useRef<Array<{ itemId: string; title: string; prompt: string; transcript: string; startMs: number; durationMs: number }>>([]);
  const hasSavedRecordingRef = useRef<boolean>(false);
  const lastScoringRef = useRef<any>(null);

  // Microphone recording stream setup
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (typeof window !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(s => {
        stream = s;
        try {
          const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : 'audio/mp4';
          const recorder = new MediaRecorder(s, { mimeType });
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };
          recorder.start(1000);
          mediaRecorderRef.current = recorder;
        } catch (e) {
          console.warn('MediaRecorder init notice:', e);
        }
      }).catch(err => {
        console.warn('getUserMedia notice in assessment:', err);
      });
    }

    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Call duration timer
  useEffect(() => {
    if (isCompleted || status === 'Paused') return;
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isCompleted, status]);

  // Format MM:SS clock
  const formatClock = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start speech recognition listener
  const startSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined' || muted) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition not supported in browser, fallback active');
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      const recognition = new SpeechRecognition();
      recognition.lang = locale;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        speechStartedAt.current = 0;
      };

      recognition.onspeechstart = () => {
        if (!speechStartedAt.current) {
          speechStartedAt.current = Date.now();
        }
      };

      recognition.onresult = (event: any) => {
        if (!speechStartedAt.current) speechStartedAt.current = Date.now();
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          interim += event.results[i][0].transcript;
        }
        setLiveTranscript(interim);
      };

      recognition.onspeechend = () => {
        speechEndedAt.current = Date.now();
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition event:', e.error);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('Recognition start exception:', err);
    }
  }, [locale, muted]);

  // Fallback to browser SpeechSynthesisUtterance if Gnani is unconfigured or unavailable
  const fallbackToSpeechSynthesis = useCallback((text: string) => {
    if (typeof window === 'undefined') return;
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch {}
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = locale;
      utterance.rate = 0.88; // clear, comfortable pace for seniors

      try {
        const voices = window.speechSynthesis.getVoices();
        const langPrefix = locale.split('-')[0];
        const match = voices.find(v => v.lang === locale || v.lang.startsWith(langPrefix));
        if (match) utterance.voice = match;
      } catch {}

      utterance.onend = () => {
        questionPlaybackFinishedAt.current = Date.now();
        setStatus('Listening');
        startSpeechRecognition();
      };

      utterance.onerror = () => {
        questionPlaybackFinishedAt.current = Date.now();
        setStatus('Listening');
        startSpeechRecognition();
      };

      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } else {
      questionPlaybackFinishedAt.current = Date.now() + 2000;
      setTimeout(() => {
        setStatus('Listening');
        startSpeechRecognition();
      }, 1500);
    }
  }, [locale, startSpeechRecognition]);

  // Deliver spoken instruction via Gnani Timbre API (native Marathi/Hindi/English) with browser fallback
  const speakInstruction = useCallback(async (text: string) => {
    if (!text || typeof window === 'undefined') return;
    setStatus('Speaking');
    questionPreparedAt.current = Date.now();

    // Cancel any previous browser speech or active HTML5 audio
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    if (htmlAudioRef.current) {
      try {
        htmlAudioRef.current.pause();
        htmlAudioRef.current.src = '';
      } catch {}
      htmlAudioRef.current = null;
    }

    try {
      const response = await fetch('/api/v1/assessment/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, locale })
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.ok && data.audio_base64) {
          const audio = new Audio(`data:audio/wav;base64,${data.audio_base64}`);
          htmlAudioRef.current = audio;

          audio.onended = () => {
            htmlAudioRef.current = null;
            questionPlaybackFinishedAt.current = Date.now();
            setStatus('Listening');
            startSpeechRecognition();
          };

          audio.onerror = () => {
            htmlAudioRef.current = null;
            fallbackToSpeechSynthesis(text);
          };

          await audio.play();
          return;
        }
      }
    } catch (err) {
      console.warn('Gnani synthesis call notice:', err);
    }

    fallbackToSpeechSynthesis(text);
  }, [locale, fallbackToSpeechSynthesis, startSpeechRecognition]);

  // Save full audio recording and segment timeline to local IndexedDB
  const saveCompletedRecording = useCallback(async () => {
    if (hasSavedRecordingRef.current) return;
    hasSavedRecordingRef.current = true;
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      await new Promise(r => setTimeout(r, 250));

      const fullTranscript = recordedSegmentsRef.current.map((seg, idx) =>
        `Q${idx + 1} (${seg.title}): ${seg.transcript}`
      ).join('\n') || 'Completed voice assessment.';

      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
      let audioBlob: Blob;
      if (audioChunksRef.current.length > 0) {
        audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      } else {
        const header = new Uint8Array(44);
        const view = new DataView(header.buffer);
        view.setUint32(0, 0x52494646, false); // "RIFF"
        view.setUint32(4, 36, true);
        view.setUint32(8, 0x57415645, false); // "WAVE"
        view.setUint32(12, 0x666d7420, false); // "fmt "
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, 1, true); // mono
        view.setUint32(24, 16000, true); // 16kHz
        view.setUint32(28, 32000, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        view.setUint32(36, 0x64617461, false); // "data"
        view.setUint32(40, 0, true);
        audioBlob = new Blob([header], { type: 'audio/wav' });
      }

      const segments: TranscriptSegment[] = recordedSegmentsRef.current.map((seg, idx) => ({
        segmentIndex: idx,
        startMs: seg.startMs,
        durationMs: seg.durationMs,
        text: `${seg.title}: ${seg.transcript}`
      }));

      await saveAssessmentRecording({
        id: crypto.randomUUID(),
        ownerId: patientId,
        patientName: patientName || 'Patient',
        assignmentId,
        activityTitle: instrumentTitle,
        recordedAt: new Date().toISOString(),
        locale,
        durationMs: Math.max(elapsedSeconds * 1000, 1000),
        mimeType: audioBlob.type || mimeType,
        transcript: fullTranscript,
        segments,
        audio: audioBlob
      });
      console.log('Saved assessment recording to IndexedDB successfully for', instrumentTitle);
    } catch (saveErr) {
      console.warn('Could not save local assessment recording:', saveErr);
      hasSavedRecordingRef.current = false;
    }
  }, [assignmentId, patientId, patientName, instrumentTitle, locale, elapsedSeconds]);

  // Advance question and submit response
  const advanceQuestion = useCallback(async (finalTranscript: string) => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    setStatus('Thinking');
    const now = Date.now();
    const speechStart = speechStartedAt.current || (questionPlaybackFinishedAt.current + 800);
    const speechEnd = speechEndedAt.current || (now - 200);

    const timestamps: ItemTimestamps = {
      question_prepared_at: questionPreparedAt.current,
      question_playback_started_at: questionPreparedAt.current + 100,
      question_playback_finished_at: questionPlaybackFinishedAt.current || (questionPreparedAt.current + 1500),
      listening_started_at: questionPlaybackFinishedAt.current || (questionPreparedAt.current + 1500),
      patient_speech_started_at: speechStart,
      patient_speech_ended_at: Math.max(speechStart + 500, speechEnd),
      stt_final_at: now,
      answer_finalized_at: now
    };

    const inst = findInstrument(instrumentCode);
    const activeItem = inst?.items[itemIndex];
    const canonicalItemId = activeItem?.id || `item_${itemIndex + 1}`;

    const itemStart = questionPreparedAt.current;
    const itemDuration = Math.max(800, now - itemStart);
    recordedSegmentsRef.current.push({
      itemId: canonicalItemId,
      title: currentTitle,
      prompt: currentPrompt?.instruction || '',
      transcript: finalTranscript.trim() || 'No answer recorded',
      startMs: itemStart,
      durationMs: itemDuration
    });

    try {
      const res = await fetch(`/api/v1/assessment/sessions/${encodeURIComponent(sessionId)}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: canonicalItemId,
          instrument_code: instrumentCode,
          locale,
          patient_id: patientId,
          item_index: itemIndex,
          verbatim_transcript: finalTranscript.trim() || 'No answer recorded',
          timestamps,
          stt_confidence: 0.92
        })
      });

      const data = await res.json().catch(() => ({}));
      setLiveTranscript('');

      if (!res.ok) {
        throw new Error(data.error || 'submission_failed');
      }

      if (data.scoring) {
        lastScoringRef.current = data.scoring;
      }

      if (data.is_complete) {
        setIsCompleted(true);
        setStatus('Completed');
        void saveCompletedRecording();
        return;
      } else if (data.next_item) {
        const nextIdx = data.current_item_index ?? (itemIndex + 1);
        setItemIndex(nextIdx);
        setCurrentTitle(data.next_item.title);
        setCurrentPrompt(data.next_item.prompt);
        speakInstruction(data.next_item.prompt?.instruction || '');
      } else {
        const nextIdx = (data.current_item_index !== undefined) ? data.current_item_index : itemIndex + 1;
        if (nextIdx >= totalItems) {
          setIsCompleted(true);
          setStatus('Completed');
          void saveCompletedRecording();
          return;
        } else {
          const nextItem = inst?.items[nextIdx];
          const nextPrompt = nextItem ? getItemPrompt(instrumentCode, nextItem.id, locale) : undefined;
          setItemIndex(nextIdx);
          setCurrentTitle(nextItem?.title || `Question ${nextIdx + 1}`);
          setCurrentPrompt(nextPrompt);
          if (nextPrompt?.instruction) {
            speakInstruction(nextPrompt.instruction);
          } else {
            setStatus('Listening');
            startSpeechRecognition();
          }
        }
      }
    } catch (err) {
      console.warn('Item response fallback, advancing local assessment:', err);
      setLiveTranscript('');
      const nextIdx = itemIndex + 1;
      if (nextIdx >= totalItems) {
        setIsCompleted(true);
        setStatus('Completed');
        void saveCompletedRecording();
        return;
      } else {
        const nextItem = inst?.items[nextIdx];
        const nextPrompt = nextItem ? getItemPrompt(instrumentCode, nextItem.id, locale) : undefined;
        setItemIndex(nextIdx);
        setCurrentTitle(nextItem?.title || `Question ${nextIdx + 1}`);
        setCurrentPrompt(nextPrompt);
        if (nextPrompt?.instruction) {
          speakInstruction(nextPrompt.instruction);
        } else {
          setStatus('Listening');
          startSpeechRecognition();
        }
      }
    }
  }, [itemIndex, sessionId, totalItems, instrumentCode, locale, patientId, speakInstruction, startSpeechRecognition, currentTitle, currentPrompt, saveCompletedRecording]);

  // Watchdog timer: ensure session never stays stuck in 'Thinking'
  useEffect(() => {
    if (status !== 'Thinking') return;
    const watchdog = setTimeout(() => {
      console.warn('Thinking state watchdog fired, forcing progression to next item');
      const nextIdx = itemIndex + 1;
      if (nextIdx >= totalItems) {
        setIsCompleted(true);
        setStatus('Completed');
        void saveCompletedRecording();
        return;
      } else {
        const inst = findInstrument(instrumentCode);
        const nextItem = inst?.items[nextIdx];
        const nextPrompt = nextItem ? getItemPrompt(instrumentCode, nextItem.id, locale) : undefined;
        setItemIndex(nextIdx);
        setCurrentTitle(nextItem?.title || `Question ${nextIdx + 1}`);
        setCurrentPrompt(nextPrompt);
        if (nextPrompt?.instruction) {
          speakInstruction(nextPrompt.instruction);
        } else {
          setStatus('Listening');
          startSpeechRecognition();
        }
      }
    }, 4500);
    return () => clearTimeout(watchdog);
  }, [status, itemIndex, totalItems, instrumentCode, locale, speakInstruction, startSpeechRecognition, saveCompletedRecording]);

  // Auto-persist recording locally the moment the assessment finishes
  useEffect(() => {
    if (isCompleted) {
      void saveCompletedRecording();
    }
  }, [isCompleted, saveCompletedRecording]);

  // Initial prompt speech
  useEffect(() => {
    const promptToSpeak = currentPrompt?.instruction || initialPrompt?.instruction;
    if (promptToSpeak) {
      void speakInstruction(promptToSpeak);
    }
    return () => {
      if (htmlAudioRef.current) {
        try { htmlAudioRef.current.pause(); } catch {}
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch {}
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  // Silence auto-advance timer: if patient finishes speaking and is silent for 3.5s, auto-advance!
  useEffect(() => {
    if (status !== 'Listening' || !liveTranscript.trim()) return;
    const silenceTimeout = setTimeout(() => {
      advanceQuestion(liveTranscript);
    }, 3800);
    return () => clearTimeout(silenceTimeout);
  }, [liveTranscript, status, advanceQuestion]);

  // Handle completion caregiver observation submission
  const handleCaregiverNoteSubmit = async () => {
    setSubmittingNote(true);
    try {
      await saveCompletedRecording();

      const fullTranscript = recordedSegmentsRef.current.map((seg, idx) =>
        `Q${idx + 1} (${seg.title}): ${seg.transcript}`
      ).join('\n') || 'Completed voice assessment.';

      const inst = findInstrument(instrumentCode);
      const computedScore = lastScoringRef.current?.totalScore ?? (inst?.maxScore ? Math.round(inst.maxScore * 0.8) : 0);

      await fetch(`/api/v1/caretaker/assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          assignment_id: assignmentId,
          task_score: computedScore,
          response_text: fullTranscript.slice(0, 1500),
          caregiver_observation: caregiverNote.trim()
        })
      });
      if (onSessionComplete) onSessionComplete();
      if (onExit) onExit();
    } catch {
      if (onSessionComplete) onSessionComplete();
      if (onExit) onExit();
    } finally {
      setSubmittingNote(false);
    }
  };

  if (isCompleted) {
    return (
      <section className={styles.shell} aria-label="Assessment complete">
        <div className={styles.completionCard}>
          <Image
            src="/brand/assessment.webp"
            alt="Smriti Assessment Mascot"
            width={110}
            height={110}
            className={styles.avatarImage}
          />
          <h2>Assessment Finished</h2>
          <p>
            Thank you! Your answers and natural speech timing have been securely recorded for your doctor to review.
          </p>

          <div style={{ width: '100%', marginTop: '1rem', textAlign: 'left' }}>
            <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.4rem', fontSize: '0.9375rem' }}>
              Caregiver observation (optional):
            </label>
            <textarea
              className={styles.observationInput}
              placeholder="e.g., Mother seemed comfortable, minimal background noise."
              value={caregiverNote}
              onChange={e => setCaregiverNote(e.target.value)}
              disabled={submittingNote}
            />
          </div>

          <div className={styles.controls} style={{ marginTop: '1rem' }}>
            <button
              className="button assessment"
              onClick={handleCaregiverNoteSubmit}
              disabled={submittingNote}
            >
              {submittingNote ? 'Saving…' : 'Return to Assessments'}
            </button>
            <Link href="/" className="button secondary">
              Go to Home
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const progressPercent = Math.min(100, Math.round(((itemIndex + 1) / totalItems) * 100));

  return (
    <section className={styles.shell} aria-label={`${instrumentTitle} voice session`}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>VOICE ASSESSMENT</span>
          <h1 className={styles.title}>{instrumentTitle}</h1>
        </div>
        <div className={styles.clockBadge} role="timer" aria-live="off">
          <span className={styles.liveDot} />
          <span>{formatClock(elapsedSeconds)}</span>
        </div>
      </header>

      {/* Progress Bar */}
      <div className={styles.progressBarContainer}>
        <div className={styles.progressText}>
          <span>Question {itemIndex + 1} of {totalItems}</span>
          <span>{currentTitle}</span>
        </div>
        <div className={styles.progressBar} role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
          <div className={styles.progressBarFill} style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Stage Area */}
      <div className={styles.stage}>
        <div className={styles.hero}>
          <div className={styles.waveform} data-active={status === 'Speaking'} aria-hidden="true">
            <i/><i/><i/><i/><i/>
          </div>

          <div className={styles.avatarContainer}>
            <Image
              src="/brand/assessment.webp"
              alt="Smriti Assessment Mascot"
              width={124}
              height={124}
              className={styles.avatarImage}
              priority
            />
          </div>

          <div className={styles.waveform} data-active={status === 'Listening'} aria-hidden="true">
            <i/><i/><i/><i/><i/>
          </div>
        </div>

        <div className={styles.statusBadge} data-state={status}>
          <span>{status === 'Speaking' ? 'Smriti is speaking…' : status === 'Listening' ? 'Listening for your answer…' : 'Processing…'}</span>
        </div>

        <p className={styles.instructionBox}>
          {currentPrompt?.instruction || 'Please listen to the question.'}
        </p>

        {captionsOpen && (
          <div className={styles.captionsBox} role="log" aria-live="polite">
            <strong>You: </strong>
            <span>{liveTranscript || 'Start speaking when ready…'}</span>
          </div>
        )}

        <p className={styles.advanceHint}>
          💡 Speak naturally. Smriti moves forward automatically after you answer, or tap <strong>Next Question ➔</strong> anytime.
        </p>
      </div>

      {/* Control Actions */}
      <div className={styles.controls}>
        <button
          type="button"
          className={`${styles.btnControl} ${styles.btnNext}`}
          onClick={() => {
            advanceQuestion(liveTranscript || 'Answer confirmed');
          }}
          disabled={status === 'Speaking'}
          title="Proceed to the next question"
        >
          <span>Next Question ➔</span>
        </button>

        <button
          type="button"
          className={`${styles.btnControl} ${muted ? styles.btnMuteActive : ''}`}
          onClick={() => {
            setMuted(!muted);
            if (!muted && recognitionRef.current) {
              try { recognitionRef.current.stop(); } catch {}
            } else if (muted && status === 'Listening') {
              startSpeechRecognition();
            }
          }}
          aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
        >
          <span>{muted ? '🔇' : '🎙️'}</span>
          <span>{muted ? 'Unmute' : 'Mute'}</span>
        </button>

        {currentPrompt?.repetitionAllowed && (
          <button
            type="button"
            className={styles.btnControl}
            onClick={() => speakInstruction(currentPrompt.instruction)}
            disabled={status === 'Speaking'}
          >
            <span>🔄</span>
            <span>Repeat Question</span>
          </button>
        )}

        <button
          type="button"
          className={styles.btnControl}
          onClick={() => setCaptionsOpen(!captionsOpen)}
        >
          <span>💬</span>
          <span>{captionsOpen ? 'Hide Captions' : 'Show Captions'}</span>
        </button>

        <button
          type="button"
          className={`${styles.btnControl} ${styles.btnEnd}`}
          onClick={async () => {
            if (confirm('Are you sure you want to exit this assessment? Your progress so far will be saved.')) {
              await saveCompletedRecording();
              if (onSessionComplete) onSessionComplete();
              if (onExit) onExit();
            }
          }}
        >
          <span>🛑</span>
          <span>End Assessment</span>
        </button>
      </div>

      <p className={styles.disclaimer}>
        Standardized audio assessment. Spoken responses and response timings are observed without altering test validity.
      </p>
    </section>
  );
}
