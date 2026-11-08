'use client';

import { useState } from 'react';
import { DayFirstDate } from './day-first-date';
import {
  ALL_INSTRUMENTS,
  STANDARDIZED_INSTRUMENTS,
  TRIAL_ACTIVITIES,
  findInstrument,
  type ActivityLocale,
  type InstrumentDefinition
} from '../lib/assessment/instruments';
import type { AssessmentCode } from '../lib/assessment-activities';

interface DoctorAssignModalProps {
  patientName: string;
  initialInstrumentCode?: string;
  initialDueDate?: string;
  onAssign: (code: AssessmentCode, version: string, locale: ActivityLocale, dueDate: string) => Promise<void>;
  onClose: () => void;
  isAlreadyAssigned: (code: string) => boolean;
  busy: boolean;
}

const localeLabels: Record<ActivityLocale, string> = {
  'en-IN': 'English (India) · en-IN',
  'hi-IN': 'हिन्दी · Hindi · hi-IN',
  'mr-IN': 'मराठी · Marathi · mr-IN'
};

export function DoctorAssignModal({
  patientName,
  initialInstrumentCode = 'six_cit_v1',
  initialDueDate = '',
  onAssign,
  onClose,
  isAlreadyAssigned,
  busy
}: DoctorAssignModalProps) {
  const [selectedCode, setSelectedCode] = useState<string>(initialInstrumentCode);
  const instrument = findInstrument(selectedCode) || STANDARDIZED_INSTRUMENTS[0];
  const [selectedVersion, setSelectedVersion] = useState<string>(
    instrument.availableVersions[0]?.version || instrument.version || '1.0'
  );
  const [selectedLocale, setSelectedLocale] = useState<ActivityLocale>('en-IN');
  const [dueDate, setDueDate] = useState<string>(initialDueDate);
  const [demoAcknowledged, setDemoAcknowledged] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const currentVersionSpec = instrument.availableVersions.find(v => v.version === selectedVersion) || {
    version: instrument.version,
    label: `${instrument.shortTitle} v${instrument.version}`,
    electronicAdministrationApproved: instrument.electronicAdministrationApproved,
    status: instrument.licensing.status
  };

  const isAuthPending = currentVersionSpec.status === 'authorization_pending';
  const isDemo = currentVersionSpec.status === 'original_demonstration';
  const requiresAcknowledgement = isAuthPending;
  const isAwaiting = isAlreadyAssigned(selectedCode);

  const handleInstrumentChange = (code: string) => {
    setSelectedCode(code);
    const newInst = findInstrument(code);
    if (newInst) {
      setSelectedVersion(newInst.availableVersions[0]?.version || newInst.version || '1.0');
    }
    setDemoAcknowledged(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || isAwaiting) return;
    if (requiresAcknowledgement && !demoAcknowledged) {
      setError('Please acknowledge the demonstration and electronic administration status before assigning.');
      return;
    }
    try {
      await onAssign(selectedCode as AssessmentCode, selectedVersion, selectedLocale, dueDate);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to assign assessment');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        backgroundColor: 'rgba(0,0,0,0.65)',
        display: 'grid',
        placeItems: 'center',
        padding: '1rem',
        overflowY: 'auto'
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-modal-title"
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '1.5rem',
          maxWidth: '680px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e6e4e0', paddingBottom: '0.75rem' }}>
          <div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#d82832', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              CLINICIAN ASSESSMENT DISPATCH
            </span>
            <h2 id="assign-modal-title" style={{ margin: '0.2rem 0 0', fontSize: '1.45rem', fontWeight: 800 }}>
              Assign assessment to {patientName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              fontSize: '1.25rem',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center'
            }}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Step 5: Instrument selection */}
          <div>
            <label style={{ display: 'block', fontWeight: 800, fontSize: '0.875rem', marginBottom: '0.35rem' }}>
              1. Assessment Instrument:
            </label>
            <select
              value={selectedCode}
              onChange={e => handleInstrumentChange(e.target.value)}
              disabled={busy}
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem',
                borderRadius: '0.75rem',
                border: '1px solid #a8a095',
                fontSize: '0.95rem',
                fontWeight: 600,
                background: '#fff'
              }}
            >
              <optgroup label="Standardized Clinical Assessments (Voice)">
                {STANDARDIZED_INSTRUMENTS.map(i => (
                  <option key={i.code} value={i.code}>
                    {i.title} ({i.estimatedDuration})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Trial / Familiarization Activities">
                {TRIAL_ACTIVITIES.map(i => (
                  <option key={i.code} value={i.code}>
                    {i.title} ({i.estimatedDuration})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Step 6: Version selection */}
          <div>
            <label style={{ display: 'block', fontWeight: 800, fontSize: '0.875rem', marginBottom: '0.35rem' }}>
              2. Authorized Instrument Version:
            </label>
            <select
              value={selectedVersion}
              onChange={e => {
                setSelectedVersion(e.target.value);
                setDemoAcknowledged(false);
              }}
              disabled={busy}
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem',
                borderRadius: '0.75rem',
                border: '1px solid #a8a095',
                fontSize: '0.95rem',
                fontWeight: 600,
                background: '#fff'
              }}
            >
              {instrument.availableVersions.map(v => (
                <option key={v.version} value={v.version}>
                  {v.label} {v.electronicAdministrationApproved ? '✓ Approved' : '⚠️ Demo / Pending'}
                </option>
              ))}
            </select>
          </div>

          {/* Step 7: Language selection */}
          <div>
            <label style={{ display: 'block', fontWeight: 800, fontSize: '0.875rem', marginBottom: '0.35rem' }}>
              3. Spoken Language / Locale:
            </label>
            <select
              value={selectedLocale}
              onChange={e => setSelectedLocale(e.target.value as ActivityLocale)}
              disabled={busy}
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem',
                borderRadius: '0.75rem',
                border: '1px solid #a8a095',
                fontSize: '0.95rem',
                fontWeight: 600,
                background: '#fff'
              }}
            >
              {instrument.languages.map(lang => (
                <option key={lang} value={lang}>
                  {localeLabels[lang] || lang}
                </option>
              ))}
            </select>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#655e55' }}>
              Smriti will administer all spoken instructions, prompts, and memory stimuli in this language.
            </p>
          </div>

          {/* Step 8: Electronic Administration & Licensing Check */}
          <div style={{
            padding: '1rem',
            borderRadius: '0.75rem',
            border: isAuthPending ? '1px solid #f8b4b4' : '1px solid #fed888',
            background: isAuthPending ? '#fff5f5' : '#fffbeb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '0.75rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                background: isAuthPending ? '#fde8e8' : '#fef3c7',
                color: isAuthPending ? '#9b1c1c' : '#92400e'
              }}>
                {isAuthPending ? 'Authorization Pending' : 'Demonstration Mode'}
              </span>
              <strong style={{ fontSize: '0.875rem', color: isAuthPending ? '#9b1c1c' : '#92400e' }}>
                Electronic Administration Status Check
              </strong>
            </div>

            <p style={{ margin: '0.25rem 0 0.5rem', fontSize: '0.8125rem', color: '#4b5563', lineHeight: 1.45 }}>
              {instrument.licensing.publisherNotice}
            </p>

            {requiresAcknowledgement ? (
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginTop: '0.65rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={demoAcknowledged}
                  onChange={e => setDemoAcknowledged(e.target.checked)}
                  style={{ width: '1.2rem', height: '1.2rem', marginTop: '0.1rem' }}
                />
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e1a17' }}>
                  I acknowledge that official electronic clinical administration authorization is pending. This assessment will run purely as an uncopyrighted demonstration research exercise and cannot be used for official diagnostic claims.
                </span>
              </label>
            ) : (
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#655e55' }}>
                ✓ Electronic administration authorized for demonstration and research verification.
              </p>
            )}
          </div>

          {/* Step 9: Optional Due Date */}
          <div>
            <label style={{ display: 'block', fontWeight: 800, fontSize: '0.875rem', marginBottom: '0.35rem' }}>
              4. Due Date <span style={{ fontWeight: 400, color: '#696159' }}>(optional)</span>:
            </label>
            <DayFirstDate
              value={dueDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={setDueDate}
            />
          </div>

          {/* Step 10: Duration and Accessibility Requirements Review */}
          <div style={{
            padding: '1rem',
            borderRadius: '0.75rem',
            background: '#f9fafb',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <strong style={{ fontSize: '0.875rem', color: '#111827' }}>
                Expected Duration & Clinical Purpose:
              </strong>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1556e8' }}>
                ⏱️ {instrument.estimatedDuration}
              </span>
            </div>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', color: '#4b5563', lineHeight: 1.45 }}>
              {instrument.clinicalPurpose}
            </p>

            <strong style={{ display: 'block', fontSize: '0.8125rem', color: '#374151', margin: '0.5rem 0 0.25rem' }}>
              Accessibility & Administration Requirements:
            </strong>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8125rem', color: '#4b5563', lineHeight: 1.4 }}>
              {instrument.accessibilityRequirements.map((req, idx) => (
                <li key={idx}>{req}</li>
              ))}
            </ul>
          </div>

          {isAwaiting && (
            <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: '#fffbeb', border: '1px solid #fef3c7', color: '#92400e', fontSize: '0.85rem' }}>
              ⚠️ This instrument is currently already assigned and awaiting completion by this patient.
            </div>
          )}

          {error && (
            <p style={{ margin: 0, padding: '0.75rem', borderRadius: '0.5rem', background: '#fde8e8', color: '#9b1c1c', fontSize: '0.85rem' }}>
              {error}
            </p>
          )}

          {/* Step 11: Confirm and assign */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="button secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button
              type="submit"
              className={instrument.category === 'standardized' ? 'button assessment' : 'button primary'}
              disabled={busy || isAwaiting || (requiresAcknowledgement && !demoAcknowledged) || dueDate === 'invalid'}
              style={{ minHeight: '3rem', minWidth: '180px' }}
            >
              {busy ? 'Assigning…' : isAwaiting ? 'Already Assigned' : 'Confirm and Assign →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
