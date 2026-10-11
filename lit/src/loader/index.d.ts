export type RuntimeIntelligenceFramework = 'core' | 'react' | 'lit' | 'vue';

export interface RuntimeIntelligenceLoadOptions {
  enabled?: boolean;
  framework?: RuntimeIntelligenceFramework;
  panel?: boolean;
}

export interface RuntimeIntelligenceLoadResult {
  readonly enabled: boolean;
  readonly framework: RuntimeIntelligenceFramework | null;
  readonly frameworkModule: Record<string, unknown> | null;
  readonly panelModule: Record<string, unknown> | null;
}

export type RuntimeIntelligenceModuleLoader = () => Promise<Record<string, unknown>>;

export function isRuntimeIntelligenceEnabled(value: unknown): value is true;

export function createRuntimeIntelligenceLoader(options?: {
  loaders?: Partial<Record<RuntimeIntelligenceFramework | 'panel', RuntimeIntelligenceModuleLoader>>;
}): (options?: RuntimeIntelligenceLoadOptions) => Promise<RuntimeIntelligenceLoadResult>;

export function loadRuntimeIntelligence(
  options?: RuntimeIntelligenceLoadOptions,
): Promise<RuntimeIntelligenceLoadResult>;
