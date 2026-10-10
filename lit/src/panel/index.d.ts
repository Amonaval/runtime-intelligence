import type { LitElement } from 'lit';
import type { RuntimeEvidenceStore } from '../react/index.js';

export declare class LdsDebugPanel extends LitElement {}

export interface RuntimePanelEvidenceBridge {
  readonly started: boolean;
  start(): RuntimePanelEvidenceBridge;
  stop(): RuntimePanelEvidenceBridge;
}

export function bridgeRuntimeEvidenceToPanel(options: {
  store: RuntimeEvidenceStore;
  windowTarget?: Window | null;
}): RuntimePanelEvidenceBridge;

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
  destroy(): void;
};
