import type { ReactNode } from 'react';

export class ReactAdapter {
  constructor(options?: Record<string, unknown>);
  readonly profilingEnabled: boolean;
  readonly store: RuntimeEvidenceStore;
  connect(target: object, options?: Record<string, unknown>): unknown;
  disconnect(target: object, options?: Record<string, unknown>): unknown;
  isManaged(target: object): boolean;
  recordProfilerRender(target: object, details?: Record<string, unknown>): unknown;
  describe(): Record<string, unknown>;
}

export interface RuntimeEvidenceStore {
  emit(input: Record<string, unknown>): unknown;
  subscribe(fn: (event: unknown) => void): () => void;
  snapshot(filter?: Record<string, unknown>): readonly any[];
  clear(): void;
  size(): number;
}

export class ReactIntelligenceRuntime {
  constructor(options?: { store?: RuntimeEvidenceStore; adapter?: ReactAdapter | null; profilingEnabled?: boolean; windowTarget?: Window | null });
  readonly store: RuntimeEvidenceStore;
  readonly adapter: ReactAdapter;
  readonly started: boolean;
  start(): this;
  stop(): this;
  describe(): Record<string, unknown>;
}

export function createReactIntelligenceRuntime(options?: ConstructorParameters<typeof ReactIntelligenceRuntime>[0]): ReactIntelligenceRuntime;
export const reactAdapter: ReactAdapter;

export interface RuntimeIntelligenceProviderProps {
  children: ReactNode;
  name?: string;
  enabled?: boolean;
  profilingEnabled?: boolean;
  runtime?: ReactIntelligenceRuntime | null;
  store?: RuntimeEvidenceStore;
}

export function RuntimeIntelligenceProvider(props: RuntimeIntelligenceProviderProps): ReactNode;
export function RuntimeIntelligenceProfiler(props: { children: ReactNode; name: string; source?: unknown; enabled?: boolean }): ReactNode;
export function useRuntimeIntelligence(): { runtime: ReactIntelligenceRuntime; adapter: ReactAdapter; store: RuntimeEvidenceStore; enabled: boolean } | null;
export const RuntimeIntelligenceContext: any;
