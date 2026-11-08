/**
 * Smriti AI Response-Time and Latency Analysis Engine
 * Implements Section 10 of the Master Prompt.
 * 
 * Crucial: Technical latencies (TTS synthesis, audio buffering, STT transcription,
 * Gemini processing, network) must NEVER count against or for patient cognitive response time.
 */

export interface ItemTimestamps {
  question_prepared_at: number;
  tts_generation_started_at?: number;
  tts_audio_received_at?: number;
  question_playback_started_at: number;
  question_playback_finished_at: number;
  listening_started_at: number;
  patient_speech_started_at: number;
  patient_speech_ended_at: number;
  vad_endpoint_at?: number;
  stt_first_partial_at?: number;
  stt_final_at: number;
  answer_finalized_at: number;
}

export interface LatencyAnalysis {
  /** Cognitive response initiation latency: time from prompt completion to speech onset (ms) */
  response_latency_ms: number;
  /** Actual spoken response duration (ms) */
  response_span_ms: number;
  /** Network and STT processing delay after speech finishes (ms) */
  stt_processing_delay_ms: number;
  /** Total TTS delivery time from preparation to audio completion (ms) */
  tts_total_duration_ms: number;
  /** Voice playback duration alone (ms) */
  prompt_playback_duration_ms: number;
  /** Estimated uncertainty in VAD or timestamp measurements (ms) */
  timing_uncertainty_ms: number;
  /** Quality and clinical review flags */
  quality_flags: string[];
}

export function analyzeResponseTiming(
  timestamps: ItemTimestamps,
  options: {
    expectedResponseStyle?: 'immediate_after_prompt' | 'concurrent_tap';
    maxExpectedLatencyMs?: number;
  } = {}
): LatencyAnalysis {
  const {
    question_prepared_at,
    question_playback_started_at,
    question_playback_finished_at,
    patient_speech_started_at,
    patient_speech_ended_at,
    stt_final_at
  } = timestamps;

  // 1. Cognitive Initiation Latency (ms):
  // patient_speech_started_at - question_playback_finished_at
  const rawLatency = patient_speech_started_at - question_playback_finished_at;
  const response_latency_ms = Math.max(0, rawLatency);

  // 2. Spoken Response Span (ms):
  // patient_speech_ended_at - patient_speech_started_at
  const rawSpan = patient_speech_ended_at - patient_speech_started_at;
  const response_span_ms = Math.max(0, rawSpan);

  // 3. Technical STT Processing Delay (ms):
  // stt_final_at - patient_speech_ended_at
  const rawSttDelay = stt_final_at - patient_speech_ended_at;
  const stt_processing_delay_ms = Math.max(0, rawSttDelay);

  // 4. TTS Delivery Times (ms)
  const tts_total_duration_ms = Math.max(0, question_playback_finished_at - question_prepared_at);
  const prompt_playback_duration_ms = Math.max(0, question_playback_finished_at - question_playback_started_at);

  // Timing uncertainty (estimate ~50ms for Web Audio / VAD boundary detection)
  const timing_uncertainty_ms = 45;

  const quality_flags: string[] = [];

  if (rawLatency < 0) {
    quality_flags.push('patient_spoke_before_prompt_finished');
  } else if (response_latency_ms > (options.maxExpectedLatencyMs ?? 8000)) {
    quality_flags.push('prolonged_initiation_pause');
  }

  if (response_span_ms > 25000) {
    quality_flags.push('extended_response_duration');
  } else if (response_span_ms < 300) {
    quality_flags.push('very_brief_response');
  }

  if (stt_processing_delay_ms > 4000) {
    quality_flags.push('high_network_or_stt_delay_disclosed');
  }

  return {
    response_latency_ms,
    response_span_ms,
    stt_processing_delay_ms,
    tts_total_duration_ms,
    prompt_playback_duration_ms,
    timing_uncertainty_ms,
    quality_flags
  };
}

/** Formats a timeline row for doctor review */
export interface TimelineSegment {
  label: string;
  durationMs: number;
  type: 'prompt' | 'latency' | 'speech' | 'technical';
  color: string;
}

export function buildTimelineSegments(analysis: LatencyAnalysis): TimelineSegment[] {
  return [
    {
      label: 'Smriti Speaking',
      durationMs: analysis.prompt_playback_duration_ms,
      type: 'prompt',
      color: '#c2410c' // warm red / orange
    },
    {
      label: 'Patient Pause',
      durationMs: analysis.response_latency_ms,
      type: 'latency',
      color: '#d97706' // amber
    },
    {
      label: 'Patient Speaking',
      durationMs: analysis.response_span_ms,
      type: 'speech',
      color: '#2563eb' // blue
    },
    {
      label: 'STT Processing',
      durationMs: analysis.stt_processing_delay_ms,
      type: 'technical',
      color: '#6b7280' // neutral gray
    }
  ];
}
