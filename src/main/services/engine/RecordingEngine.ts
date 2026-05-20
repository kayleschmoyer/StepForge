import { BrowserWindow } from 'electron';
import { EventEmitter } from 'node:events';
import type { AppSettings } from '@shared/models/AppSettings';
import type { Project, RecordingState, SessionMetadata } from '@shared/models/Project';
import type { RecordedStep, StepFlag } from '@shared/models/Step';
import type { Annotation } from '@shared/models/Annotation';
import { SessionStorage } from '../storage/SessionStorage';
import { InputHookService, type InputEvent } from '../hooks/InputHookService';
import { StepProcessor } from './StepProcessor';

export interface RecordingEngineEvents {
  projectChanged: [Project];
  stepAdded: [RecordedStep];
  stateChanged: [RecordingState];
  tick: [number];
}

export class RecordingEngine extends EventEmitter {
  private activeProject: Project | null = null;
  private startedAtMs = 0;
  private timer: NodeJS.Timeout | null = null;
  private processing = Promise.resolve();

  constructor(
    private storage: SessionStorage,
    private hooks: InputHookService,
    private processor: StepProcessor,
    private settingsProvider: () => Promise<AppSettings>,
    private editorProvider: () => BrowserWindow | null
  ) {
    super();
    this.hooks.on('input', (event: InputEvent) => this.enqueueInput(event));
  }

  get project(): Project | null {
    return this.activeProject;
  }

  setProject(project: Project | null): void {
    this.activeProject = project;
    if (project) this.emit('projectChanged', project);
  }

  async start(): Promise<Project> {
    if (this.activeProject?.state === 'RECORDING') return this.activeProject;
    const settings = await this.settingsProvider();
    const project = this.activeProject && this.activeProject.state !== 'STOPPED'
      ? this.activeProject
      : await this.storage.createProject('Untitled recording');
    this.startedAtMs = Date.now();
    this.activeProject = await this.storage.saveProject({
      ...project,
      state: 'RECORDING',
      metadata: { ...project.metadata, startedAt: new Date().toISOString() }
    }, true);
    await this.hooks.start(settings);
    this.startTimer();
    if (settings.minimizeOnRecord) this.editorProvider()?.minimize();
    this.emitStateAndProject();
    return this.activeProject;
  }

  async pause(): Promise<void> {
    if (!this.activeProject || this.activeProject.state !== 'RECORDING') return;
    this.hooks.stop();
    this.activeProject = await this.storage.saveProject({ ...this.activeProject, state: 'PAUSED' }, true);
    this.emitStateAndProject();
  }

  async resume(): Promise<void> {
    if (!this.activeProject || this.activeProject.state !== 'PAUSED') return;
    await this.hooks.start(await this.settingsProvider());
    this.activeProject = await this.storage.saveProject({ ...this.activeProject, state: 'RECORDING' }, true);
    this.emitStateAndProject();
  }

  async stop(): Promise<Project | null> {
    if (!this.activeProject) return null;
    this.hooks.stop();
    this.stopTimer();
    const completedAt = new Date().toISOString();
    const duration = this.elapsedSeconds();
    this.activeProject = await this.storage.saveProject({
      ...this.activeProject,
      completedAt,
      state: 'STOPPED',
      metadata: { ...this.activeProject.metadata, duration }
    }, false);
    this.editorProvider()?.restore();
    this.editorProvider()?.show();
    this.emitStateAndProject();
    return this.activeProject;
  }

  async cancel(): Promise<void> {
    this.hooks.stop();
    this.stopTimer();
    this.activeProject = null;
    this.editorProvider()?.restore();
    this.emit('stateChanged', 'IDLE');
  }

  async save(): Promise<Project | null> {
    if (!this.activeProject) return null;
    this.activeProject = await this.storage.saveProject(this.activeProject);
    this.emit('projectChanged', this.activeProject);
    return this.activeProject;
  }

  async updateMetadata(patch: Partial<SessionMetadata>): Promise<void> {
    if (!this.activeProject) return;
    this.activeProject = await this.storage.saveProject({
      ...this.activeProject,
      metadata: { ...this.activeProject.metadata, ...patch },
      isDirty: true
    });
    this.emit('projectChanged', this.activeProject);
  }

  async updateStep(id: string, patch: Partial<RecordedStep>): Promise<void> {
    await this.mutateSteps((steps) => steps.map((step) => step.id === id ? { ...step, ...patch } : step));
  }

  async reorderStep(id: string, direction: 'up' | 'down'): Promise<void> {
    await this.mutateSteps((steps) => {
      const index = steps.findIndex((step) => step.id === id);
      const target = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= steps.length) return steps;
      const next = [...steps];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return renumber(next);
    });
  }

  async duplicateStep(id: string): Promise<void> {
    await this.mutateSteps((steps) => {
      const index = steps.findIndex((step) => step.id === id);
      if (index < 0) return steps;
      const copy: RecordedStep = { ...steps[index]!, id: `step-${Date.now()}`, stepNumber: 0, timestamp: new Date().toISOString() };
      const next = [...steps];
      next.splice(index + 1, 0, copy);
      return renumber(next);
    });
  }

  async deleteStep(id: string): Promise<void> {
    await this.mutateSteps((steps) => renumber(steps.filter((step) => step.id !== id)));
  }

  async addManualStep(): Promise<void> {
    if (!this.activeProject) this.activeProject = await this.storage.createProject('Manual session');
    const now = new Date().toISOString();
    const step: RecordedStep = {
      id: `step-${Date.now()}`,
      stepNumber: this.activeProject.nextStepNumber,
      timestamp: now,
      actionType: 'ManualNote',
      description: 'Manual step',
      flags: [],
      screenshotPath: '',
      thumbnailPath: '',
      keysPressed: '',
      textEntered: '',
      scrollDelta: 0,
      scrolledDown: false,
      isRedacted: false,
      isDeleted: false,
      annotations: []
    };
    await this.appendStep(step);
  }

  async toggleFlag(id: string, flag: StepFlag): Promise<void> {
    await this.mutateSteps((steps) => steps.map((step) => {
      if (step.id !== id) return step;
      const hasFlag = step.flags.includes(flag);
      return { ...step, flags: hasFlag ? step.flags.filter((existing) => existing !== flag) : [...step.flags, flag] };
    }));
  }

  async setAnnotations(id: string, annotations: Annotation[]): Promise<void> {
    await this.mutateSteps((steps) => steps.map((step) => step.id === id ? { ...step, annotations } : step));
  }

  private enqueueInput(event: InputEvent): void {
    this.processing = this.processing.then(async () => {
      if (!this.activeProject || this.activeProject.state !== 'RECORDING') return;
      const step = await this.processor.process(this.activeProject, event, await this.settingsProvider());
      if (!step) return;
      await this.appendStep(step);
    }).catch((error) => console.error('[recording-engine] input processing failed', error));
  }

  private async appendStep(step: RecordedStep): Promise<void> {
    if (!this.activeProject) return;
    this.activeProject = await this.storage.saveProject({
      ...this.activeProject,
      steps: [...this.activeProject.steps, step],
      nextStepNumber: step.stepNumber + 1,
      isDirty: true
    }, this.activeProject.state === 'RECORDING' || this.activeProject.state === 'PAUSED');
    this.emit('stepAdded', step);
    this.emit('projectChanged', this.activeProject);
  }

  private async mutateSteps(mutator: (steps: RecordedStep[]) => RecordedStep[]): Promise<void> {
    if (!this.activeProject) return;
    const steps = mutator(this.activeProject.steps);
    this.activeProject = await this.storage.saveProject({
      ...this.activeProject,
      steps,
      nextStepNumber: Math.max(1, steps.length + 1),
      isDirty: true
    });
    this.emit('projectChanged', this.activeProject);
  }

  private startTimer(): void {
    this.stopTimer();
    this.timer = setInterval(() => this.emit('tick', this.elapsedSeconds()), 1000);
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private elapsedSeconds(): number {
    return this.startedAtMs ? Math.floor((Date.now() - this.startedAtMs) / 1000) : 0;
  }

  private emitStateAndProject(): void {
    this.emit('stateChanged', this.activeProject?.state ?? 'IDLE');
    if (this.activeProject) this.emit('projectChanged', this.activeProject);
  }
}

function renumber(steps: RecordedStep[]): RecordedStep[] {
  return steps.map((step, index) => ({ ...step, stepNumber: index + 1 }));
}