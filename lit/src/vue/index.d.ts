export interface RuntimeSourceLocation {
  file?: string | null;
  line?: number | null;
  column?: number | null;
  functionName?: string | null;
}

export type RuntimeSource = string | RuntimeSourceLocation | null;

export interface RuntimeEvidenceStore {
  emit(input: Record<string, unknown>): any;
  subscribe(fn: (event: any) => void): () => void;
  snapshot(filter?: Record<string, unknown>): readonly any[];
  clear(): void;
  size(): number;
}

export class VueAdapter {
  constructor(options?: Record<string, unknown>);
  readonly store: RuntimeEvidenceStore;
  connect(target: object, options?: {
    name?: string;
    source?: RuntimeSource;
    parentId?: string | null;
  }): any;
  disconnect(target: object, options?: { source?: RuntimeSource; reason?: string }): unknown;
  linkParent(target: object, parentTarget: object): any;
  ownerOf(target: object): any;
  isManaged(target: object): boolean;
  recordUpdateStarted(target: object, options?: { source?: RuntimeSource }): unknown;
  recordUpdateCompleted(target: object, options?: { source?: RuntimeSource }): unknown;
  recordError(
    target: object | null,
    error: unknown,
    options?: { source?: RuntimeSource; phase?: string; info?: unknown },
  ): unknown;
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

export const vueAdapter: VueAdapter;

export class VueIntelligenceRuntime {
  constructor(options?: {
    store?: RuntimeEvidenceStore;
    adapter?: VueAdapter | null;
    version?: string | null;
    windowTarget?: Window | null;
    correlationContext?: any;
    slowRenderThresholdMs?: number;
  });
  readonly store: RuntimeEvidenceStore;
  readonly adapter: VueAdapter;
  readonly started: boolean;
  readonly correlationContext: any;
  start(): this;
  stop(): this;
  describe(): Record<string, unknown>;
}

export function createVueIntelligenceRuntime(
  options?: ConstructorParameters<typeof VueIntelligenceRuntime>[0],
): VueIntelligenceRuntime;

export interface VueRuntimeIntelligenceController {
  readonly enabled: boolean;
  readonly runtime: VueIntelligenceRuntime | null;
  readonly adapter: VueAdapter | null;
  readonly store: RuntimeEvidenceStore | null;
  stop(): boolean;
}

export interface VueAppLike {
  mixin(mixin: Record<string, (...args: any[]) => unknown>): unknown;
  config: {
    errorHandler?: ((error: unknown, instance: any, info: string) => unknown) | null;
  };
}

export function installVueRuntimeIntelligence(
  app: VueAppLike,
  options?: {
    enabled?: boolean;
    runtime?: VueIntelligenceRuntime | null;
    store?: RuntimeEvidenceStore;
    version?: string | null;
    windowTarget?: Window | null;
    sourceResolver?: ((componentProxy: any) => RuntimeSource) | null;
    componentFilter?: ((componentProxy: any) => boolean) | null;
    slowRenderThresholdMs?: number;
  },
): VueRuntimeIntelligenceController;
