import type { ReactAdapter, RuntimeEvidenceStore } from '../react/index.js';

export interface RuntimePanelModel {
  eventCount: number;
  diagnosticCount: number;
  opportunityCount: number;
  byType: Readonly<Record<string, number>>;
  framework: any;
  recent: readonly any[];
}

export const OPPORTUNITY_FLAGS: readonly string[];
export function buildRuntimeIntelligencePanelModel(options: { store: RuntimeEvidenceStore; adapter?: ReactAdapter | null; limit?: number }): RuntimePanelModel;
export function mountRuntimeIntelligencePanel(options: {
  store: RuntimeEvidenceStore;
  adapter?: ReactAdapter | null;
  title?: string;
  collapsed?: boolean;
  documentTarget?: Document | null;
}): { element: HTMLElement | null; render(): void; setCollapsed(next: boolean): void; destroy(): void };
