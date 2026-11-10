'use client';

import { useState } from 'react';
import type { ActivityLocale } from '../lib/assessment/instruments';
import styles from './voice-assessment-session.module.css';

interface PreflightProps {
  instrumentTitle: string;
  category: 'standardized' | 'trial';
  initialLocale: ActivityLocale;
  onConfirm: (selectedLocale: ActivityLocale, proctorPresent: boolean) => void;
  onCancel: () => void;
}

export function AssessmentPreflightModal({
  instrumentTitle,
  category,
  initialLocale,
  onConfirm,
  onCancel
}: PreflightProps) {
  const [locale, setLocale] = useState<ActivityLocale>(initialLocale);
  const [micTested, setMicTested] = useState(false);
  const [speakerTested, setSpeakerTested] = useState(false);
  const [consentChecked, setConsentChecked] = useState(true);
  const [proctorPresent, setProctorPresent] = useState(false);

  const fallbackSpeaker = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch {}
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = locale;
      utter.onend = () => setSpeakerTested(true);
      utter.onerror = () => setSpeakerTested(true);
      window.speechSynthesis.speak(utter);
    } else {
      setSpeakerTested(true);
    }
  };

  const testSpeaker = async () => {
    const text = locale === 'hi-IN'
      ? 'नमस्ते, यह आवाज़ की जाँच है।'
      : locale === 'mr-IN'
      ? 'नमस्कार, ही आवाजाची चाचणी आहे.'
      : locale === 'bn-IN'
      ? 'নমস্কার, এটি স্মৃতির ভয়েস পরীক্ষা।'
      : 'Hello, this is a speaker check for Smriti.';

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }

    try {
      const res = await fetch('/api/v1/assessment/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, locale })
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.ok && data.audio_base64) {
          const audio = new Audio(`data:audio/wav;base64,${data.audio_base64}`);
          audio.onended = () => setSpeakerTested(true);
          audio.onerror = () => fallbackSpeaker(text);
          await audio.play();
          return;
        }
      }
    } catch {}

    fallbackSpeaker(text);
  };

  const testMic = async () => {
    if (navigator?.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        setMicTested(true);
      } catch {
        alert('Microphone permission is required to take this voice assessment.');
      }
    } else {
      setMicTested(true);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      display: 'grid',
      placeItems: 'center',
      padding: '1rem'
    }} role="dialog" aria-modal="true" aria-labelledby="preflight-title">
      <div style={{
        background: '#ffffff',
        borderRadius: '1.5rem',
        maxWidth: '540px',
        width: '100%',
        padding: '2rem',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}>
        <div style={{ borderBottom: '1px solid #e6e4e0', paddingBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#d82832', textTransform: 'uppercase' }}>
            {category === 'trial' ? 'TRIAL EXERCISE PRECHECK' : 'CLINICAL PRECHECK'}
          </span>
          <h2 id="preflight-title" style={{ margin: '0.25rem 0 0', fontSize: '1.35rem', fontWeight: 800 }}>
            {instrumentTitle}
          </h2>
        </div>

        <p style={{ margin: 0, fontSize: '0.9375rem', color: '#5d5f64', lineHeight: 1.5 }}>
          Before beginning, make sure you are in a quiet room with minimal distractions.
        </p>

        {/* Language Selection */}
        <div>
          <label style={{ display: 'block', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.35rem' }}>
            Assessment Language:
          </label>
          <select
            value={locale}
            onChange={e => {
              setLocale(e.target.value as ActivityLocale);
              setSpeakerTested(false);
            }}
            style={{
              width: '100%',
              padding: '0.65rem 0.75rem',
              borderRadius: '0.75rem',
              border: '1px solid #898781',
              fontSize: '1rem',
              fontWeight: 600
            }}
          >
            <option value="en-IN">English (India)</option>
            <option value="hi-IN">हिन्दी · Hindi</option>
            <option value="mr-IN">मराठी · Marathi</option>
          </select>
        </div>

        {/* Precheck Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <button
            type="button"
            className="button secondary"
            onClick={testSpeaker}
            style={{ minHeight: '3rem', fontSize: '0.875rem' }}
          >
            {speakerTested ? '✓ Speaker OK' : '🔊 Test Speaker'}
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={testMic}
            style={{ minHeight: '3rem', fontSize: '0.875rem' }}
          >
            {micTested ? '✓ Mic OK' : '🎙️ Allow Microphone'}
          </button>
        </div>

        {/* Proctor / Caregiver Presence */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontSize: '0.875rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={proctorPresent}
            onChange={e => setProctorPresent(e.target.checked)}
            style={{ width: '1.2rem', height: '1.2rem', marginTop: '0.1rem' }}
          />
          <span>
            <strong>Caregiver / Proctor is present in the room</strong>
            <br />
            <small style={{ color: '#5d5f64' }}>
              Confirm that no one will assist the patient with answers during testing.
            </small>
          </span>
        </label>

        {/* Consent check */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontSize: '0.875rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={e => setConsentChecked(e.target.checked)}
            style={{ width: '1.2rem', height: '1.2rem', marginTop: '0.1rem' }}
          />
          <span>
            <strong>Consent for audio assessment capture</strong>
            <br />
            <small style={{ color: '#5d5f64' }}>
              Spoken responses and response times will be recorded securely for clinician review.
            </small>
          </span>
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="button" className="button secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="button assessment"
            disabled={!consentChecked}
            onClick={() => onConfirm(locale, proctorPresent)}
          >
            Begin Voice Assessment →
          </button>
        </div>
      </div>
    </div>
  );
}
