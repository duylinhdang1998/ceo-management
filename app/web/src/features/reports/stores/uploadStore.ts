import { create } from 'zustand';

// ── Upload Phase ──────────────────────────────────────────────────────────────
export type UploadPhase = 'uploading' | 'processing' | 'done' | 'error';

// ── Upload State ──────────────────────────────────────────────────────────────
interface UploadState {
  active: boolean;
  filename: string;
  /** 0–100 percentage; only meaningful during 'uploading' phase */
  progress: number;
  phase: UploadPhase;

  // Actions
  startUpload: (filename: string) => void;
  setProgress: (progress: number) => void;
  setPhase: (phase: UploadPhase) => void;
  finishUpload: () => void;
  errorUpload: () => void;
  clearUpload: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────
export const useUploadStore = create<UploadState>()((set) => ({
  active: false,
  filename: '',
  progress: 0,
  phase: 'uploading',

  startUpload: (filename) =>
    set({ active: true, filename, progress: 0, phase: 'uploading' }),

  setProgress: (progress) => set({ progress }),

  setPhase: (phase) => set({ phase }),

  finishUpload: () =>
    set({ phase: 'done', progress: 100 }),

  errorUpload: () =>
    set({ phase: 'error' }),

  clearUpload: () =>
    set({ active: false, filename: '', progress: 0, phase: 'uploading' }),
}));
