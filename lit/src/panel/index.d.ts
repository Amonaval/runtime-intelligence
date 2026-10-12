import type { LitElement } from 'lit';
import type { RuntimeEvidenceStore } from '../react/index.js';

export declare class LdsDebugPanel extends LitElement {}

export interface RuntimePanelEvidenceBridge {
  readonly started: boolean;
  start(): RuntimePanelEvidenceBridge;
  stop(): RuntimePanelEvidenceBridge;
}

export interface RuntimeFindingDeveloperGuidance {
  whySource: string;
  whatNext: string;
  adoptionLevel: 0 | 1 | 2;
  evidenceLimit: string;
}

export interface RuntimeNormalizedFinding {
  id: string;
  kind: string;
  owner?: unknown;
  source?: unknown;
  evidence?: unknown;
  message?: string;
  recommendation?: string | null;
  developerGuidance?: RuntimeFindingDeveloperGuidance;
  payload?: unknown;
}

export interface RuntimeNormalizedOpportunity extends RuntimeNormalizedFinding {
  flag: string;
  correlation?: unknown;
}

export type DiagnosticBeforeAfterStatusValue =
  | 'awaiting-baseline'
  | 'awaiting-replay'
  | 'improved'
  | 'unchanged'
  | 'regressed'
  | 'inconclusive';

export interface DiagnosticBeforeAfterState {
  schemaVersion: 'diagnostic-before-after/1';
  workflowId: string;
  status: DiagnosticBeforeAfterStatusValue;
  headline: string;
  nextAction: string;
  evidenceNote: string;
  target: Record<string, unknown>;
  intervention: Record<string, unknown> | null;
  baseline: unknown;
  replay: unknown;
  comparison: unknown;
  verification: unknown;
}

export interface DiagnosticBeforeAfterSession {
  captureBaseline(options?: {
    runId?: string | null;
    label?: string;
    capturedAt?: number;
    baselineId?: string | null;
  }): DiagnosticBeforeAfterState;
  captureReplay(options?: {
    runId?: string | null;
    label?: string;
    capturedAt?: number;
    causalEvidence?: unknown;
  }): DiagnosticBeforeAfterState;
  reset(): DiagnosticBeforeAfterState;
  getState(): DiagnosticBeforeAfterState;
  toJSON(): DiagnosticBeforeAfterState;
}

export interface RuntimeExportReport {
  schemaVersion: 'runtime-intelligence-report/1';
  reportTime: string;
  note: string;
  framework: string;
  sessionId: string | null;
  summary: {
    evidenceCount: number;
    diagnosticCount: number;
    opportunityCount: number;
    normalizedFindingCount: number;
    evidenceByType: Record<string, number>;
  };
  normalizedFindings: RuntimeNormalizedFinding[];
  opportunities: RuntimeNormalizedOpportunity[];
  diagnostics: unknown[];
  intelligence: unknown;
  evidenceCapsule: unknown;
  diagnosticBeforeAfter?: DiagnosticBeforeAfterState | null;
  evidence: unknown[];
  legacyReport: Record<string, unknown>;
  exportPrivacy?: {
    enforced: boolean;
    boundary: string;
    redacted: number;
    dropped: number;
    shaped: number;
    maskedUrls: number;
    truncated: number;
  };
}

export const DiagnosticBeforeAfterStatus: Readonly<{
  AWAITING_BASELINE: 'awaiting-baseline';
  AWAITING_REPLAY: 'awaiting-replay';
  IMPROVED: 'improved';
  UNCHANGED: 'unchanged';
  REGRESSED: 'regressed';
  INCONCLUSIVE: 'inconclusive';
}>;

export function createDiagnosticBeforeAfterSession(options: {
  store: RuntimeEvidenceStore;
  workflowId: string;
  target: Record<string, unknown>;
  metrics?: unknown[];
  intervention?: Record<string, unknown>;
  clock?: () => number;
  runIdFactory?: (phase: 'before' | 'after') => string;
}): DiagnosticBeforeAfterSession;

export function bridgeRuntimeEvidenceToPanel(options: {
  store: RuntimeEvidenceStore;
  windowTarget?: Window | null;
}): RuntimePanelEvidenceBridge;

export function enhanceRuntimeIssueForFramework<T extends Record<string, unknown>>(
  issue: T,
  options?: { framework?: string },
): T & { developerGuidance: RuntimeFindingDeveloperGuidance };

export function createRuntimeReport(options?: {
  baseReport?: Record<string, unknown>;
  store?: RuntimeEvidenceStore | null;
  windowTarget?: Window | null;
  framework?: string | null;
  note?: string;
  diagnosticBeforeAfter?: DiagnosticBeforeAfterState | null;
}): RuntimeExportReport;

export function buildRuntimeReportHtml(report: RuntimeExportReport): string;

export function downloadRuntimeReport(options: {
  report: RuntimeExportReport;
  format?: 'json' | 'html';
  documentTarget?: Document | null;
  prefix?: string;
}): string | null;

export function downloadRuntimeReports(options: {
  report: RuntimeExportReport;
  documentTarget?: Document | null;
  prefix?: string;
}): { json: string | null; html: string | null };

export function mountRuntimeIntelligencePanel(options: {
  store: RuntimeEvidenceStore;
  documentTarget?: Document | null;
  windowTarget?: Window | null;
  collapsed?: boolean;
}): {
  element: HTMLElement | null;
  bridge: RuntimePanelEvidenceBridge | null;
  refresh(): void;
  setCollapsed(next: boolean): void;
  startBeforeAfter(options: Omit<Parameters<typeof createDiagnosticBeforeAfterSession>[0], 'store'>): DiagnosticBeforeAfterSession;
  getBeforeAfterState(): DiagnosticBeforeAfterState | null;
  createReport(note?: string): RuntimeExportReport;
  downloadJson(): string | null;
  downloadHtml(): string | null;
  downloadBoth(): { json: string | null; html: string | null };
  destroy(): void;
};

export const OPPORTUNITY_FLAGS: readonly (readonly [string, string])[];
