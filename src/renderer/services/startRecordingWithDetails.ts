import { useProjectStore } from '@renderer/state/projectStore';

export async function startRecordingWithDetails(): Promise<void> {
  useProjectStore.getState().setRecordingSetupOpen(true);
}

export async function beginRecordingWithDetails(jiraNumber: string, description: string): Promise<void> {
  const jiraKey = normalizeJiraKey(jiraNumber);
  if (!jiraKey) return;

  const title = description.trim() || `Xray test for ${jiraKey}`;
  const project = await window.stepForge.project.create({ title, jiraKey });
  useProjectStore.getState().setProject(project);
  useProjectStore.getState().setView('EDITOR');
  useProjectStore.getState().updateMetadata({ jiraKey, title });
  await window.stepForge.project.updateMetadata({ patch: { jiraKey, title } });
  await window.stepForge.recording.start();
}

export function normalizeJiraKey(input: string): string {
  const value = input.trim().toUpperCase();
  const digits = value.startsWith('VAST-')
    ? value.slice(5).replace(/\D/g, '')
    : value.startsWith('VAST')
      ? value.slice(4).replace(/\D/g, '')
      : value.replace(/\D/g, '');
  return digits ? `VAST-${digits}` : '';
}