import type { LitElement } from 'lit';
import type { RuntimeEvidenceStore } from '../react/index.js';

export declare class LdsDebugPanel extends LitElement {}

export interface RuntimePanelEvidenceBridge {
  readonly started: boolean;
  start(): RuntimePanelEvidenceBridge;
  stop(): RuntimePanelEvidenceBridge;
}

export interface RuntimeNormalizedFinding {
  id: string;
  kind: string;
  owner?: unknown;
  source?: unknown;
  evidence?: unknown;
  message?: string;
  recommendation?: string | null;
  payload?: unknown;
}

export interface RuntimeNormalizedOpportunity extends RuntimeNormalizedFinding {
  flag: string;
  correlation?: unknown;
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

export function bridgeRuntimeEvidenceToPanel(options: {
  store: RuntimeEvidenceStore;
  windowTarget?: Window | null;
}): RuntimePanelEvidenceBridge;

export function enhanceRuntimeIssueForFramework<T extends Record<string, unknown>>(
  issue: T,
  options?: { framework?: string },
): T;

export function createRuntimeReport(options?: {
  baseReport?: Record<string, unknown>;
  store?: RuntimeEvidenceStore | null;
  windowTarget?: Window | null;
  framework?: string | null;
  note?: string;
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
  createReport(note?: string): RuntimeExportReport;
  downloadJson(): string | null;
  downloadHtml(): string | null;
  downloadBoth(): { json: string | null; html: string | null };
  destroy(): void;
};

export const OPPORTUNITY_FLAGS: readonly (readonly [string, string])[];
