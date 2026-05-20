import { randomUUID } from 'node:crypto';
import type { AppSettings } from '@shared/models/AppSettings';
import type { Project } from '@shared/models/Project';
import type { ActionType, RecordedStep, WindowInfo } from '@shared/models/Step';
import { CaptureService } from '../capture/CaptureService';
import { ImageOps } from '../capture/ImageOps';
import { WindowTracker } from '../automation/WindowTracker';
import { ImageStorage } from '../storage/ImageStorage';
import type { InputEvent } from '../hooks/InputHookService';
import { describeInput } from './StepDescriber';
import { diagnostics } from '../diagnostics/DiagnosticsStore';

export class StepProcessor {
  constructor(
    private captureService: CaptureService,
    private imageOps: ImageOps,
    private imageStorage: ImageStorage,
    private windowTracker: WindowTracker
  ) {}

  async process(project: Project, event: InputEvent, settings: AppSettings): Promise<RecordedStep | null> {
    const startedAt = Date.now();
    const windowInfo = event.kind === 'mouse' || event.kind === 'wheel'
      ? await this.windowTracker.getWindowAtPoint(event.x, event.y)
      : await this.windowTracker.getForegroundWindow();
    const windowLookupMs = Date.now() - startedAt;
    if ((event.kind === 'mouse' || event.kind === 'wheel') && !windowInfo) {
      diagnostics.record('info', 'recording', 'Skipped input because no capturable window was found.');
      return null;
    }
    if (shouldIgnoreWindow(windowInfo, settings)) {
      diagnostics.record('info', 'recording', `Skipped excluded window: ${windowInfo?.title || windowInfo?.processName || 'unknown'}`);
      return null;
    }
    await delay(settings.captureDelayMs);
    const capture = await this.captureService.captureWindow(
      settings.windowOnlyCapture ? windowInfo?.handle : undefined,
      settings.windowOnlyCapture ? windowInfo?.bounds : undefined
    );
    const captureMs = Date.now() - startedAt - windowLookupMs - settings.captureDelayMs;
    const stepId = `step-${randomUUID()}`;
    const screenshot = capture.png;
    const thumbnailPromise = this.imageOps.thumbnail(screenshot);
    const screenshotPathPromise = this.imageStorage.saveScreenshot(project, stepId, screenshot);
    const thumbnail = await thumbnailPromise;
    const screenshotPath = await screenshotPathPromise;
    const thumbnailPath = await this.imageStorage.saveThumbnail(project, stepId, thumbnail);
    const totalMs = Date.now() - startedAt;
    if (totalMs > 1200) {
      diagnostics.record('warning', 'recording', `Step capture took ${totalMs} ms.`, `window=${windowLookupMs} ms, capture=${Math.max(0, captureMs)} ms`);
    }

    return {
      id: stepId,
      stepNumber: project.nextStepNumber,
      timestamp: event.timestamp,
      actionType: this.actionType(event),
      description: describeInput(event),
      flags: [],
      window: windowInfo,
      screenshotPath,
      thumbnailPath,
      keysPressed: event.kind === 'key' ? event.keys : '',
      textEntered: event.kind === 'key' ? event.text : '',
      scrollDelta: event.kind === 'wheel' ? event.delta : 0,
      scrolledDown: event.kind === 'wheel' ? event.delta < 0 : false,
      isRedacted: false,
      isDeleted: false,
      annotations: [],
      warnings: capture.warnings
    };
  }

  private actionType(event: InputEvent): ActionType {
    if (event.kind === 'wheel') return 'Scroll';
    if (event.kind === 'key') return event.shortcut ? 'KeyboardShortcut' : 'TextEntry';
    if (event.doubleClick) return 'DoubleClick';
    if (event.button === 'right') return 'RightClick';
    if (event.button === 'middle') return 'MiddleClick';
    return 'LeftClick';
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldIgnoreWindow(windowInfo: WindowInfo | undefined, settings: AppSettings): boolean {
  if (!windowInfo) return false;
  const processName = windowInfo.processName?.toLowerCase() ?? '';
  const title = windowInfo.title?.toLowerCase() ?? '';
  const excludedProcesses = new Set(settings.excludedProcesses.map((process) => process.toLowerCase()));
  if (excludedProcesses.has(processName)) return true;
  if (processName === 'stepforge.exe' || processName === 'kaylesstepsrecorder.exe') return true;
  return title.includes('stepforge') || title.includes("kayle's steps recorder");
}