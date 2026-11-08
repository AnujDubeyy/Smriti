/**
 * Smriti AI Cognitive Assessment Instrument Registry
 * Standardized instruments and trial/familiarization exercises.
 */

export type InstrumentCategory = 'standardized' | 'trial';
export type ActivityLocale = 'en-IN' | 'hi-IN' | 'mr-IN';
export type LicensingStatus = 'original_demonstration' | 'licensed_clinical' | 'authorization_pending';

export interface InstrumentItemSpec {
  id: string;
  domain: string;
  title: string;
  expectedResponseType: 'year' | 'month' | 'time' | 'backward_count' | 'reverse_months' | 'address_recall' | 'word_list' | 'digits_forward' | 'digits_backward' | 'fluency' | 'sentence_repetition' | 'abstraction' | 'orientation';
  repeatAllowed: boolean;
  timeLimitSeconds?: number;
  maxPoints?: number;
}

export interface InstrumentDefinition {
  code: string;
  title: string;
  shortTitle: string;
  category: InstrumentCategory;
  description: string;
  clinicalPurpose: string;
  estimatedDuration: string;
  languages: ActivityLocale[];
  version: string;
  maxScore?: number;
  licensing: {
    status: LicensingStatus;
    publisherNotice: string;
    isOfficialScoringActive: boolean;
    explanation: string;
  };
  items: InstrumentItemSpec[];
}

export const TRIAL_ACTIVITIES: InstrumentDefinition[] = [
  {
    code: 'smriti_word_repeat_v1',
    title: 'Repeat five words',
    shortTitle: 'Word repetition (Trial)',
    category: 'trial',
    description: 'Hear five everyday words, then repeat what was heard.',
    clinicalPurpose: 'Familiarize patient and caregiver with Smriti voice listening and prompt delivery.',
    estimatedDuration: '2–3 min',
    languages: ['en-IN', 'hi-IN', 'mr-IN'],
    version: '1.0',
    maxScore: 5,
    licensing: {
      status: 'original_demonstration',
      publisherNotice: 'Original Smriti familiarization exercise. Not a copyrighted clinical test.',
      isOfficialScoringActive: false,
      explanation: 'Designed to help the patient practice speaking with Smriti in a relaxed environment.'
    },
    items: [
      {
        id: 'trial_words_1',
        domain: 'Familiarization / Verbal Repetition',
        title: 'Repeat five words',
        expectedResponseType: 'word_list',
        repeatAllowed: true,
        maxPoints: 5
      }
    ]
  },
  {
    code: 'smriti_category_fluency_v1',
    title: 'Name animals',
    shortTitle: 'Animal fluency (Trial)',
    category: 'trial',
    description: 'Name as many animals as possible in one minute, at a comfortable pace.',
    clinicalPurpose: 'Practice speaking continuously into the microphone with a timer.',
    estimatedDuration: '1 min',
    languages: ['en-IN', 'hi-IN', 'mr-IN'],
    version: '1.0',
    licensing: {
      status: 'original_demonstration',
      publisherNotice: 'Original Smriti timed practice task.',
      isOfficialScoringActive: false,
      explanation: 'Helps the patient become familiar with the microphone and 60-second activity pacing.'
    },
    items: [
      {
        id: 'trial_animals_1',
        domain: 'Familiarization / Timed Speech',
        title: 'Name animals in 60s',
        expectedResponseType: 'fluency',
        repeatAllowed: false,
        timeLimitSeconds: 60
      }
    ]
  },
  {
    code: 'smriti_orientation_v1',
    title: 'Day and place conversation',
    shortTitle: 'Day & place (Trial)',
    category: 'trial',
    description: 'Respond to gentle questions about the day and current surroundings.',
    clinicalPurpose: 'Familiarize patient with multi-turn conversational question answering.',
    estimatedDuration: '2 min',
    languages: ['en-IN', 'hi-IN', 'mr-IN'],
    version: '1.0',
    maxScore: 2,
    licensing: {
      status: 'original_demonstration',
      publisherNotice: 'Original Smriti orientation practice conversation.',
      isOfficialScoringActive: false,
      explanation: 'Gently tests interactive conversational flow before standardized tests.'
    },
    items: [
      {
        id: 'trial_day_1',
        domain: 'Familiarization / Orientation',
        title: 'Current day and place',
        expectedResponseType: 'orientation',
        repeatAllowed: true,
        maxPoints: 2
      }
    ]
  }
];

export const STANDARDIZED_INSTRUMENTS: InstrumentDefinition[] = [
  {
    code: 'six_cit_v1',
    title: '6-Item Cognitive Impairment Test (6CIT)',
    shortTitle: '6CIT',
    category: 'standardized',
    description: 'Brief, 6-item verbal cognitive screening test evaluating temporal orientation, mental manipulation and memory recall.',
    clinicalPurpose: 'Rapid cognitive impairment screening with weighted error scoring (Kingshill format, max 28 points).',
    estimatedDuration: '3–5 min',
    languages: ['en-IN', 'hi-IN', 'mr-IN'],
    version: '1.0',
    maxScore: 28,
    licensing: {
      status: 'original_demonstration',
      publisherNotice: 'Demonstration research engine. Official Kingshill 6CIT electronic scoring active only with licensed institution pack.',
      isOfficialScoringActive: false,
      explanation: 'Demonstration materials are presented for software verification; official scoring requires clinical authorization.'
    },
    items: [
      { id: '6cit_item_1', domain: 'Temporal Orientation', title: 'Current Year', expectedResponseType: 'year', repeatAllowed: false, maxPoints: 4 },
      { id: '6cit_item_2', domain: 'Temporal Orientation', title: 'Current Month', expectedResponseType: 'month', repeatAllowed: false, maxPoints: 3 },
      { id: '6cit_stimulus', domain: 'Memory Stimulus', title: 'Address Stimulus Presentation', expectedResponseType: 'word_list', repeatAllowed: true },
      { id: '6cit_item_3', domain: 'Temporal Orientation', title: 'Approximate Time', expectedResponseType: 'time', repeatAllowed: false, maxPoints: 3 },
      { id: '6cit_item_4', domain: 'Attention / Calculation', title: 'Count Backwards 20 to 1', expectedResponseType: 'backward_count', repeatAllowed: false, maxPoints: 4 },
      { id: '6cit_item_5', domain: 'Attention / Working Memory', title: 'Months in Reverse Order', expectedResponseType: 'reverse_months', repeatAllowed: false, maxPoints: 4 },
      { id: '6cit_item_6', domain: 'Delayed Memory Recall', title: 'Address Recall (5 components)', expectedResponseType: 'address_recall', repeatAllowed: false, maxPoints: 10 }
    ]
  },
  {
    code: 'tics_v1',
    title: 'Telephone Interview for Cognitive Status (TICS)',
    shortTitle: 'TICS',
    category: 'standardized',
    description: 'Structured 11-item telephone screening instrument for cognitive status across orientation, attention, language and recall.',
    clinicalPurpose: 'Standardized verbal cognitive screening specifically designed for telephone / audio administration.',
    estimatedDuration: '10–15 min',
    languages: ['en-IN', 'hi-IN', 'mr-IN'],
    version: '1.0',
    licensing: {
      status: 'authorization_pending',
      publisherNotice: 'TICS proprietary instrument. Proprietary text, weights and normative interpretations withheld pending license.',
      isOfficialScoringActive: false,
      explanation: 'Uses uncopyrighted demonstration prompts for interface testing. Official instrument items require publisher authorization.'
    },
    items: [
      { id: 'tics_01', domain: 'Personal Orientation', title: 'Name and age confirmation', expectedResponseType: 'orientation', repeatAllowed: false },
      { id: 'tics_02', domain: 'Temporal Orientation', title: 'Date, day, month, year, season', expectedResponseType: 'orientation', repeatAllowed: false },
      { id: 'tics_03', domain: 'Spatial Orientation', title: 'Location confirmation', expectedResponseType: 'orientation', repeatAllowed: false },
      { id: 'tics_04', domain: 'Attention', title: 'Count backwards from 20', expectedResponseType: 'backward_count', repeatAllowed: false },
      { id: 'tics_05', domain: 'Verbal Learning', title: 'Word list immediate learning', expectedResponseType: 'word_list', repeatAllowed: false },
      { id: 'tics_06', domain: 'Calculation', title: 'Serial subtraction', expectedResponseType: 'backward_count', repeatAllowed: false },
      { id: 'tics_07', domain: 'Language', title: 'Responsive naming', expectedResponseType: 'word_list', repeatAllowed: false },
      { id: 'tics_08', domain: 'Language', title: 'Repetition', expectedResponseType: 'sentence_repetition', repeatAllowed: false },
      { id: 'tics_09', domain: 'General Knowledge', title: 'Current affairs orientation', expectedResponseType: 'orientation', repeatAllowed: false },
      { id: 'tics_10', domain: 'Comprehension', title: 'Verbal comprehension', expectedResponseType: 'orientation', repeatAllowed: false },
      { id: 'tics_11', domain: 'Delayed Recall', title: 'Delayed word list recall', expectedResponseType: 'word_list', repeatAllowed: false }
    ]
  },
  {
    code: 'moca_blind_v1',
    title: 'Montreal Cognitive Assessment — Blind (MoCA Blind)',
    shortTitle: 'MoCA Blind',
    category: 'standardized',
    description: '22-point auditory/verbal adaptation of the MoCA assessing memory, attention, language, abstraction and orientation.',
    clinicalPurpose: 'Comprehensive verbal cognitive assessment excluding visual tasks, scored on a 22-point scale.',
    estimatedDuration: '10–12 min',
    languages: ['en-IN', 'hi-IN', 'mr-IN'],
    version: '1.0',
    maxScore: 22,
    licensing: {
      status: 'authorization_pending',
      publisherNotice: 'MoCA is copyrighted. Electronic adaptation requires MoCA Test Inc. approval.',
      isOfficialScoringActive: false,
      explanation: 'The architecture implements all 5 MoCA Blind domains. Official clinical deployment requires publisher agreement.'
    },
    items: [
      { id: 'moca_mem_learn', domain: 'Memory Encoding', title: '5-Word Learning (2 trials)', expectedResponseType: 'word_list', repeatAllowed: false },
      { id: 'moca_attn_digits_fwd', domain: 'Attention', title: 'Forward Digit Span', expectedResponseType: 'digits_forward', repeatAllowed: false, maxPoints: 1 },
      { id: 'moca_attn_digits_bwd', domain: 'Attention', title: 'Backward Digit Span', expectedResponseType: 'digits_backward', repeatAllowed: false, maxPoints: 1 },
      { id: 'moca_attn_vigilance', domain: 'Attention', title: 'Auditory Vigilance Detection', expectedResponseType: 'word_list', repeatAllowed: false, maxPoints: 1 },
      { id: 'moca_attn_subtraction', domain: 'Attention', title: 'Serial Subtraction (100 - 7)', expectedResponseType: 'backward_count', repeatAllowed: false, maxPoints: 3 },
      { id: 'moca_lang_repeat_1', domain: 'Language', title: 'Sentence Repetition 1', expectedResponseType: 'sentence_repetition', repeatAllowed: false, maxPoints: 1 },
      { id: 'moca_lang_repeat_2', domain: 'Language', title: 'Sentence Repetition 2', expectedResponseType: 'sentence_repetition', repeatAllowed: false, maxPoints: 1 },
      { id: 'moca_lang_fluency', domain: 'Language', title: 'Verbal Fluency (60s)', expectedResponseType: 'fluency', repeatAllowed: false, timeLimitSeconds: 60, maxPoints: 1 },
      { id: 'moca_abstraction', domain: 'Abstraction', title: 'Verbal Comparison / Abstraction', expectedResponseType: 'abstraction', repeatAllowed: false, maxPoints: 2 },
      { id: 'moca_delayed_recall', domain: 'Delayed Recall', title: 'Delayed 5-Word Free Recall', expectedResponseType: 'word_list', repeatAllowed: false, maxPoints: 5 },
      { id: 'moca_orientation', domain: 'Orientation', title: 'Temporal & Place Orientation (6 items)', expectedResponseType: 'orientation', repeatAllowed: false, maxPoints: 6 }
    ]
  }
];

export const ALL_INSTRUMENTS: InstrumentDefinition[] = [
  ...TRIAL_ACTIVITIES,
  ...STANDARDIZED_INSTRUMENTS
];

export function findInstrument(code: string): InstrumentDefinition | undefined {
  return ALL_INSTRUMENTS.find(i => i.code === code);
}

export function isStandardizedInstrument(code: string): boolean {
  return STANDARDIZED_INSTRUMENTS.some(i => i.code === code);
}

export function isTrialActivity(code: string): boolean {
  return TRIAL_ACTIVITIES.some(i => i.code === code);
}
