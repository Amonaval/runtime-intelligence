import type {
  ComponentType,
  Dispatch,
  EffectCallback,
  ReactNode,
  SetStateAction,
} from 'react';

export interface RuntimeSourceLocation {
  file?: string | null;
  line?: number | null;
  column?: number | null;
  functionName?: string | null;
}

export type RuntimeSource = string | RuntimeSourceLocation | null;

export class ReactAdapter {
  constructor(options?: Record<string, unknown>);
  readonly profilingEnabled: boolean;
  readonly store: RuntimeEvidenceStore;
  connect(target: object, options?: Record<string, unknown>): any;
  disconnect(target: object, options?: Record<string, unknown>): unknown;
  linkParent(target: object, parentTarget: object): any;
  ownerOf(target: object): any;
  isManaged(target: object): boolean;
  recordUpdateRequested(target: object, details?: Record<string, unknown>): unknown;
  recordStateChange(
    target: object,
    key: string,
    oldValue: unknown,
    newValue: unknown,
    options?: { source?: RuntimeSource },
  ): unknown;
  recordProfilerRender(target: object, details?: Record<string, unknown>): unknown;
  recordEffectStarted(target: object, effectId: string, options?: Record<string, unknown>): unknown;
  recordEffectCleanup(target: object, effectId: string, options?: Record<string, unknown>): unknown;
  recordResourceAcquired(
    target: object,
    options: { resourceId: string; resourceType?: string; source?: RuntimeSource },
  ): unknown;
  recordResourceReleased(
    target: object,
    options: { resourceId: string; resourceType?: string; source?: RuntimeSource },
  ): unknown;
  describe(): Record<string, unknown>;
}

export interface RuntimeEvidenceStore {
  emit(input: Record<string, unknown>): any;
  subscribe(fn: (event: any) => void): () => void;
  snapshot(filter?: Record<string, unknown>): readonly any[];
  clear(): void;
  size(): number;
}

export class ReactIntelligenceRuntime {
  constructor(options?: {
    store?: RuntimeEvidenceStore;
    adapter?: ReactAdapter | null;
    profilingEnabled?: boolean;
    windowTarget?: Window | null;
    correlationContext?: any;
  });
  readonly store: RuntimeEvidenceStore;
  readonly adapter: ReactAdapter;
  readonly started: boolean;
  readonly correlationContext: any;
  start(): this;
  stop(): this;
  describe(): Record<string, unknown>;
}

export function createReactIntelligenceRuntime(
  options?: ConstructorParameters<typeof ReactIntelligenceRuntime>[0],
): ReactIntelligenceRuntime;

export const reactAdapter: ReactAdapter;

export interface RuntimeIntelligenceProviderProps {
  children: ReactNode;
  name?: string;
  source?: RuntimeSource;
  enabled?: boolean;
  profilingEnabled?: boolean;
  profileRoot?: boolean;
  runtime?: ReactIntelligenceRuntime | null;
  store?: RuntimeEvidenceStore;
}

export interface RuntimeOwnerContextValue {
  runtime: ReactIntelligenceRuntime;
  adapter: ReactAdapter;
  token: object;
  name: string;
  source: RuntimeSource;
}

export function RuntimeIntelligenceProvider(
  props: RuntimeIntelligenceProviderProps,
): ReactNode;

export function RuntimeIntelligenceProfiler(props: {
  children: ReactNode;
  name: string;
  source?: RuntimeSource;
  enabled?: boolean;
}): ReactNode;

export function withRuntimeIntelligence<P>(
  Component: ComponentType<P>,
  options?: { name?: string; source?: RuntimeSource; enabled?: boolean },
): ComponentType<P>;

export function useRuntimeIntelligence(): {
  runtime: ReactIntelligenceRuntime;
  adapter: ReactAdapter;
  store: RuntimeEvidenceStore;
  enabled: boolean;
} | null;

export function useRuntimeOwner(): RuntimeOwnerContextValue | null;

export function useRuntimeEffect(
  effect: EffectCallback,
  deps: readonly unknown[],
  options?: { id?: string; source?: RuntimeSource; kind?: string },
): void;

export function useRuntimeResource(
  resourceId: string,
  resourceType?: string,
  options?: { active?: boolean; source?: RuntimeSource },
): void;

export function useRuntimeTrackedState<S>(
  initialValue: S | (() => S),
  options?: { key?: string; source?: RuntimeSource },
): [S, Dispatch<SetStateAction<S>>];

export const RuntimeIntelligenceContext: any;
export const RuntimeIntelligenceOwnerContext: any;
