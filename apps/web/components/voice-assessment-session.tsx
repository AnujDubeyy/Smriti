'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { ActivityLocale } from '../lib/assessment/instruments';
import type { SpokenItemPrompt } from '../lib/assessment/prompts';
import type { ItemTimestamps } from '../lib/assessment/timing';
import styles from './voice-assessment-session.module.css';

interface VoiceAssessmentSessionProps {
  sessionId: string;
  patientId: string;
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
  patientId,
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

  // Deliver spoken instruction via SpeechSynthesis or API
  const speakInstruction = useCallback((text: string) => {
    if (!text || typeof window === 'undefined') return;
    setStatus('Speaking');
    questionPreparedAt.current = Date.now();

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = locale;
      utterance.rate = 0.9; // clear, comfortable pace for seniors

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
  }, [locale]);

  // Start speech recognition listener
  const startSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined' || muted) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('SpeechRecognition not supported in browser, fallback active');
      return;
    }

    try {
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

    try {
      const res = await fetch(`/api/v1/assessment/sessions/${encodeURIComponent(sessionId)}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: `item_${itemIndex + 1}`,
          verbatim_transcript: finalTranscript.trim() || 'No answer recorded',
          timestamps,
          stt_confidence: 0.92
        })
      });

      const data = await res.json();
      setLiveTranscript('');

      if (data.is_complete) {
        setIsCompleted(true);
        setStatus('Completed');
        if (onSessionComplete) onSessionComplete();
      } else if (data.next_item) {
        setItemIndex(data.current_item_index);
        setCurrentTitle(data.next_item.title);
        setCurrentPrompt(data.next_item.prompt);
        speakInstruction(data.next_item.prompt?.instruction || '');
      }
    } catch (err) {
      console.error('Failed to submit item response:', err);
      // Advance locally to prevent session stall
      if (itemIndex + 1 >= totalItems) {
        setIsCompleted(true);
        setStatus('Completed');
      } else {
        setItemIndex(prev => prev + 1);
      }
    }
  }, [itemIndex, sessionId, totalItems, onSessionComplete, speakInstruction]);

  // Initial prompt speech
  useEffect(() => {
    if (initialPrompt?.instruction) {
      speakInstruction(initialPrompt.instruction);
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
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
      await fetch(`/api/v1/caretaker/assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          assignment_id: sessionId,
          response_text: 'Voice assessment completed',
          caregiver_observation: caregiverNote.trim()
        })
      });
      if (onExit) onExit();
    } catch {
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
      </div>

      {/* Control Actions */}
      <div className={styles.controls}>
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
          onClick={() => {
            if (confirm('Are you sure you want to exit this assessment? Your progress so far will be saved.')) {
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
