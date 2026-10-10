import type { ReactAdapter, RuntimeEvidenceStore } from '../react/index.js';

export interface RuntimeRenderBoundarySummary {
  name: string;
  source: string | null;
  commits: number;
  mountCommits: number;
  updateCommits: number;
  totalDurationMs: number;
  avgDurationMs: number;
  maxDurationMs: number;
  lastTimestamp: number | null;
}

export interface RuntimeRenderActivity {
  totalCommits: number;
  totalDurationMs: number;
  maxDurationMs: number;
  boundaries: readonly RuntimeRenderBoundarySummary[];
  displayBoundaries: readonly RuntimeRenderBoundarySummary[];
  hiddenOverlapCount: number;
  interpretation: string;
}

export interface RuntimeOpportunitySummary {
  flag: string | null;
  label: string;
  source: string | null;
  count: number;
  confidence: number | null;
  attribution: string | null;
  evidenceLevel: string | null;
  lastTimestamp: number | null;
  why: string;
  inspect: string;
}

export interface RuntimeRecentSignal {
  id: string;
  type: string;
  timestamp: number | null;
  owner: string | null;
  source: string | null;
  label: string;
  occurrences: number;
  evidenceLevel: string | null;
  attribution: string | null;
  confidence: number | null;
  opportunity: boolean;
}

export interface RuntimePanelModel {
  eventCount: number;
  diagnosticCount: number;
  opportunityCount: number;
  opportunitySummaries: readonly RuntimeOpportunitySummary[];
  byType: Readonly<Record<string, number>>;
  framework: any;
  renderActivity: RuntimeRenderActivity;
  recentSignals: readonly RuntimeRecentSignal[];
  recent: readonly any[];
}

export const OPPORTUNITY_FLAGS: readonly string[];
export function buildRuntimeIntelligencePanelModel(options: { store: RuntimeEvidenceStore; adapter?: ReactAdapter | null; limit?: number; renderBoundaryLimit?: number }): RuntimePanelModel;
export function mountRuntimeIntelligencePanel(options: {
  store: RuntimeEvidenceStore;
  adapter?: ReactAdapter | null;
  title?: string;
  collapsed?: boolean;
  documentTarget?: Document | null;
}): { element: HTMLElement | null; render(): void; setCollapsed(next: boolean): void; destroy(): void };
