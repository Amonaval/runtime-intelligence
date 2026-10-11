export interface RuntimeEvidenceStore {
  emit(input: Record<string, unknown>): any;
  subscribe(fn: (event: any) => void): () => void;
  snapshot(filter?: Record<string, unknown>): readonly any[];
}

export interface RuntimeExtensionManifest {
  readonly id: string;
  readonly version: string;
  readonly extensionApiVersion: string;
  readonly urepSchemaVersion: string;
}

export interface RuntimeExtensionFramework {
  name: string;
  version?: string | null;
  adapterVersion?: string | null;
}

export interface RuntimeExtension {
  readonly manifest: RuntimeExtensionManifest;
  emit(input: Record<string, unknown>): any;
  diagnostic(
    name: string,
    payload?: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): any;
  snapshot(filter?: Record<string, unknown>): readonly any[];
  subscribe(fn: (event: any) => void): () => void;
  describe(): {
    manifest: RuntimeExtensionManifest;
    framework: RuntimeExtensionFramework;
    allowConfirmedCausality: boolean;
  };
}

export const RUNTIME_EXTENSION_API_VERSION: '1.0';
export const UREP_SCHEMA_VERSION: string;

export function isRuntimeExtensionCompatible(manifest?: {
  extensionApiVersion?: string;
  urepSchemaVersion?: string;
}): boolean;

export function assertRuntimeExtensionCompatibility(manifest?: {
  extensionApiVersion?: string;
  urepSchemaVersion?: string;
}): true;

export function createRuntimeExtension(options: {
  id: string;
  version?: string;
  store: RuntimeEvidenceStore;
  framework?: string | RuntimeExtensionFramework | null;
  extensionApiVersion?: string;
  urepSchemaVersion?: string;
  allowConfirmedCausality?: boolean;
}): RuntimeExtension;
