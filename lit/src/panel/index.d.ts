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
  interpretation: string;
}

export interface RuntimePanelModel {
  eventCount: number;
  diagnosticCount: number;
  opportunityCount: number;
  byType: Readonly<Record<string, number>>;
  framework: any;
  renderActivity: RuntimeRenderActivity;
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
