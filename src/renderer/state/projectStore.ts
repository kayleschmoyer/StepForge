import { create } from 'zustand';
import type { Project, RecentProject, RecordingState } from '@shared/models/Project';
import type { SessionMetadata } from '@shared/models/Project';
import type { RecordedStep, StepFlag } from '@shared/models/Step';
import type { Annotation } from '@shared/models/Annotation';
import type { AppSettings } from '@shared/models/AppSettings';
import { defaultAppSettings } from '@shared/models/AppSettings';
import type { RecoveryInfo, UpdateStatus } from '@shared/models/Ipc';

export type ViewName = 'HOME' | 'EDITOR';
export type EditorTab = 'edit' | 'preview';
export type AnnotationTool =
  | 'select'
  | 'arrow'
  | 'rect'
  | 'circle'
  | 'text'
  | 'number'
  | 'blur'
  | 'redact';

interface AppState {
  view: ViewName;
  editorTab: EditorTab;
  activeTool: AnnotationTool;

  project: Project | null;
  selectedStepId: string | null;
  recentProjects: RecentProject[];

  recState: RecordingState;
  recDuration: number;
  unsavedRecovery: RecoveryInfo | null;

  exportOpen: boolean;
  settingsOpen: boolean;
  paletteOpen: boolean;
  recordingSetupOpen: boolean;
  firstRunSetupOpen: boolean;
  diagnosticsOpen: boolean;

  settings: AppSettings;
  updateStatus: UpdateStatus;

  // ── Actions ────────────────────────────────────────────
  setView: (view: ViewName) => void;
  setEditorTab: (tab: EditorTab) => void;
  setActiveTool: (tool: AnnotationTool) => void;

  setProject: (project: Project | null) => void;
  updateMetadata: (patch: Partial<SessionMetadata>) => void;
  setRecentProjects: (recents: RecentProject[]) => void;
  selectStep: (id: string | null) => void;
  updateStep: (id: string, patch: Partial<RecordedStep>) => void;
  setStepAnnotations: (id: string, annotations: Annotation[]) => void;
  toggleFlag: (id: string, flag: StepFlag) => void;
  reorderStep: (id: string, dir: 'up' | 'down') => void;
  duplicateStep: (id: string) => void;
  deleteStep: (id: string) => void;

  setRecState: (state: RecordingState) => void;
  setRecDuration: (seconds: number) => void;
  setUnsavedRecovery: (info: RecoveryInfo | null) => void;

  setExportOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setPaletteOpen: (open: boolean) => void;
  setRecordingSetupOpen: (open: boolean) => void;
  setFirstRunSetupOpen: (open: boolean) => void;
  setDiagnosticsOpen: (open: boolean) => void;

  setSettings: (settings: AppSettings) => void;
  setUpdateStatus: (status: UpdateStatus) => void;
}

export const useProjectStore = create<AppState>((set) => ({
  view: 'HOME',
  editorTab: 'edit',
  activeTool: 'select',

  project: null,
  selectedStepId: null,
  recentProjects: [],

  recState: 'IDLE',
  recDuration: 0,
  unsavedRecovery: null,

  exportOpen: false,
  settingsOpen: false,
  paletteOpen: false,
  recordingSetupOpen: false,
  firstRunSetupOpen: false,
  diagnosticsOpen: false,

  settings: { ...defaultAppSettings },
  updateStatus: { status: 'idle' },

  setView: (view) => set({ view }),
  setEditorTab: (editorTab) => set({ editorTab }),
  setActiveTool: (activeTool) => set({ activeTool }),

  setProject: (project) => set((state) => {
    const currentSelectionStillExists = project?.steps.some((step) => step.id === state.selectedStepId);
    return {
      project,
      selectedStepId: currentSelectionStillExists ? state.selectedStepId : (project?.steps[0]?.id ?? null)
    };
  }),
  updateMetadata: (patch) =>
    set((state) => {
      if (!state.project) return state;
      return {
        project: {
          ...state.project,
          metadata: { ...state.project.metadata, ...patch },
          isDirty: true
        }
      };
    }),
  setRecentProjects: (recentProjects) => set({ recentProjects }),
  selectStep: (selectedStepId) => set({ selectedStepId }),
  updateStep: (id, patch) =>
    set((s) => {
      if (!s.project) return s;
      return {
        project: {
          ...s.project,
          isDirty: true,
          steps: s.project.steps.map((step) => (step.id === id ? { ...step, ...patch } : step))
        }
      };
    }),
  setStepAnnotations: (id, annotations) =>
    set((s) => {
      if (!s.project) return s;
      return {
        project: {
          ...s.project,
          isDirty: true,
          steps: s.project.steps.map((step) => (step.id === id ? { ...step, annotations } : step))
        }
      };
    }),
  toggleFlag: (id, flag) =>
    set((s) => {
      if (!s.project) return s;
      return {
        project: {
          ...s.project,
          isDirty: true,
          steps: s.project.steps.map((step) => {
            if (step.id !== id) return step;
            const has = step.flags.includes(flag);
            return {
              ...step,
              flags: has ? step.flags.filter((f) => f !== flag) : [...step.flags, flag]
            };
          })
        }
      };
    }),
  reorderStep: (id, dir) =>
    set((s) => {
      if (!s.project) return s;
      const idx = s.project.steps.findIndex((st) => st.id === id);
      if (idx < 0) return s;
      const next = [...s.project.steps];
      const target = dir === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= next.length) return s;
      [next[idx], next[target]] = [next[target]!, next[idx]!];
      return {
        project: {
          ...s.project,
          isDirty: true,
          steps: next.map((st, i) => ({ ...st, stepNumber: i + 1 }))
        }
      };
    }),
  duplicateStep: (id) =>
    set((s) => {
      if (!s.project) return s;
      const idx = s.project.steps.findIndex((st) => st.id === id);
      if (idx < 0) return s;
      const original = s.project.steps[idx]!;
      const copy: RecordedStep = {
        ...original,
        id: 'step-' + crypto.randomUUID(),
        stepNumber: 0
      };
      const next = [...s.project.steps];
      next.splice(idx + 1, 0, copy);
      return {
        project: {
          ...s.project,
          isDirty: true,
          steps: next.map((st, i) => ({ ...st, stepNumber: i + 1 }))
        }
      };
    }),
  deleteStep: (id) =>
    set((s) => {
      if (!s.project) return s;
      const next = s.project.steps.filter((st) => st.id !== id);
      const selected = s.selectedStepId === id ? (next[0]?.id ?? null) : s.selectedStepId;
      return {
        project: {
          ...s.project,
          isDirty: true,
          steps: next.map((st, i) => ({ ...st, stepNumber: i + 1 }))
        },
        selectedStepId: selected
      };
    }),
  setRecState: (recState) => set({ recState }),
  setRecDuration: (recDuration) => set({ recDuration }),
  setUnsavedRecovery: (unsavedRecovery) => set({ unsavedRecovery }),

  setExportOpen: (exportOpen) => set({ exportOpen }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setRecordingSetupOpen: (recordingSetupOpen) => set({ recordingSetupOpen }),
  setFirstRunSetupOpen: (firstRunSetupOpen) => set({ firstRunSetupOpen }),
  setDiagnosticsOpen: (diagnosticsOpen) => set({ diagnosticsOpen }),

  setSettings: (settings) => set({ settings }),
  setUpdateStatus: (updateStatus) => set({ updateStatus })
}));
