export type TranscriptSegment = { startMs: number; durationMs: number; text: string; segmentIndex?: number };

export type AssessmentRecording = {
  id: string;
  ownerId: string;
  patientName: string;
  assignmentId: string;
  activityTitle: string;
  recordedAt: string;
  locale: string;
  durationMs: number;
  mimeType: string;
  transcript: string;
  segments: TranscriptSegment[];
  audio: Blob;
};

const DB_NAME = 'smriti-assessment-recordings';
const STORE = 'recordings';
const FORMAT_MAGIC = 'SMRITI-AUDIO/1\n';
const MAX_PACKAGE_BYTES = 50 * 1024 * 1024;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('local_storage_unavailable'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) {
        const store = database.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('ownerId', 'ownerId', { unique: false });
        store.createIndex('recordedAt', 'recordedAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('local_storage_unavailable'));
  });
}

export async function saveAssessmentRecording(recording: AssessmentRecording) {
  const database = await openDatabase();
  try {
    const sanitized: AssessmentRecording = {
      ...recording,
      ownerId: recording.ownerId || 'default-patient',
      id: recording.id || crypto.randomUUID(),
      recordedAt: recording.recordedAt || new Date().toISOString()
    };
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).put(sanitized);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('recording_save_failed'));
      transaction.onabort = () => reject(transaction.error ?? new Error('recording_save_failed'));
    });
  } finally { database.close(); }
}

export async function listAssessmentRecordings(ownerId?: string): Promise<AssessmentRecording[]> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const store = database.transaction(STORE, 'readonly').objectStore(STORE);
      if (!ownerId) {
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as AssessmentRecording[]).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)));
        req.onerror = () => reject(req.error ?? new Error('recording_load_failed'));
        return;
      }
      const request = store.index('ownerId').getAll(ownerId);
      request.onsuccess = () => {
        const results = request.result as AssessmentRecording[];
        if (results.length > 0) {
          resolve(results.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)));
          return;
        }
        // Fallback: search all recordings on this browser if ownerId mismatch or demo switch
        const allReq = store.getAll();
        allReq.onsuccess = () => {
          const all = allReq.result as AssessmentRecording[];
          const matched = all.filter(r => r.ownerId === ownerId || !r.ownerId || r.ownerId === 'demo-patient');
          resolve((matched.length > 0 ? matched : all).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)));
        };
        allReq.onerror = () => resolve(results);
      };
      request.onerror = () => reject(request.error ?? new Error('recording_load_failed'));
    });
  } finally { database.close(); }
}

export async function deleteAssessmentRecording(id: string) {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('recording_delete_failed'));
    });
  } finally { database.close(); }
}

export async function updateAssessmentRecordingTranscript(id: string, transcript: string) {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readwrite');
      const store = transaction.objectStore(STORE);
      const request = store.get(id);
      request.onsuccess = () => {
        const recording = request.result as AssessmentRecording | undefined;
        if (recording) store.put({ ...recording, transcript: transcript.slice(0, 1500) });
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('recording_update_failed'));
    });
  } finally { database.close(); }
}

type PackageManifest = Omit<AssessmentRecording, 'audio' | 'ownerId' | 'assignmentId'> & { formatVersion: 1 };

export async function createAssessmentFile(recording: AssessmentRecording): Promise<File> {
  const manifest: PackageManifest = {
    formatVersion: 1, id: recording.id, patientName: recording.patientName,
    activityTitle: recording.activityTitle,
    recordedAt: recording.recordedAt, locale: recording.locale, durationMs: recording.durationMs,
    mimeType: recording.mimeType, transcript: recording.transcript, segments: recording.segments,
  };
  const header = new TextEncoder().encode(JSON.stringify(manifest));
  const magic = new TextEncoder().encode(FORMAT_MAGIC);
  const length = new Uint8Array(4);
  new DataView(length.buffer).setUint32(0, header.byteLength, false);
  const bytes = new Uint8Array(magic.byteLength + length.byteLength + header.byteLength);
  bytes.set(magic, 0);
  bytes.set(length, magic.byteLength);
  bytes.set(header, magic.byteLength + length.byteLength);
  return new File([bytes, recording.audio], `${safeFilename(recording.patientName)}-${safeFilename(recording.activityTitle)}-${recording.recordedAt.slice(0, 10)}.smriti`, { type: 'application/vnd.smriti.assessment' });
}

export async function parseAssessmentFile(file: File): Promise<AssessmentRecording> {
  if (file.size > MAX_PACKAGE_BYTES || file.size < FORMAT_MAGIC.length + 5) throw new Error('This Smriti file is too large or incomplete.');
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const magic = new TextEncoder().encode(FORMAT_MAGIC);
  if (!magic.every((value, index) => bytes[index] === value)) throw new Error('This file is not a supported Smriti assessment recording.');
  const headerLength = new DataView(buffer).getUint32(magic.byteLength, false);
  const headerStart = magic.byteLength + 4;
  const audioStart = headerStart + headerLength;
  if (!headerLength || headerLength > 128 * 1024 || audioStart >= bytes.byteLength) throw new Error('The Smriti file is incomplete.');
  let header: PackageManifest;
  try { header = JSON.parse(new TextDecoder().decode(bytes.subarray(headerStart, audioStart))) as PackageManifest; }
  catch { throw new Error('The Smriti file has an invalid transcript header.'); }
  if (!header || header.formatVersion !== 1 || typeof header.id !== 'string' || typeof header.patientName !== 'string' || header.patientName.length > 120 || typeof header.activityTitle !== 'string' || header.activityTitle.length > 180 || typeof header.recordedAt !== 'string' || !Number.isFinite(Date.parse(header.recordedAt)) || typeof header.durationMs !== 'number' || !Number.isFinite(header.durationMs) || header.durationMs < 0 || header.durationMs > 120000 || typeof header.locale !== 'string' || !['en-IN','hi-IN','mr-IN'].includes(header.locale) || typeof header.transcript !== 'string' || header.transcript.length > 1500 || !Array.isArray(header.segments) || header.segments.length > 200 || typeof header.mimeType !== 'string' || !header.mimeType.startsWith('audio/') || bytes.byteLength === audioStart) {
    throw new Error('The Smriti file is missing required assessment details.');
  }
  const segments = header.segments.filter((item): item is TranscriptSegment => !!item && Number.isFinite(item.startMs) && Number.isFinite(item.durationMs) && typeof item.text === 'string').map(item => ({ startMs: Math.min(header.durationMs, Math.max(0, item.startMs)), durationMs: Math.min(header.durationMs, Math.max(0, item.durationMs)), text: item.text.slice(0, 3000), ...(Number.isInteger(item.segmentIndex) ? { segmentIndex: item.segmentIndex } : {}) }));
  const audio = new Blob([bytes.subarray(audioStart)], { type: header.mimeType || 'audio/webm' });
  return { ...header, ownerId: '', assignmentId: '', segments, audio } as AssessmentRecording;
}

function safeFilename(value: string) {
  return value.normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'patient';
}

export function formatRecordingTime(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
