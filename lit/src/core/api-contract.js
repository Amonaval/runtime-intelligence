const RUNTIME_INTELLIGENCE_API_VERSION = '0.1';

const PUBLIC_PACKAGE_SURFACES = Object.freeze([
  'runtime-intelligence/loader',
  'runtime-intelligence/core',
  'runtime-intelligence/extension',
  'runtime-intelligence/react',
  'runtime-intelligence/lit',
  'runtime-intelligence/vue',
  'runtime-intelligence/panel',
  'runtime-intelligence/panel/lit',
]);

const PUBLIC_API_COMPATIBILITY = Object.freeze({
  packagePre1BreakingChanges: 'minor-version',
  packageStableBreakingChanges: 'major-version',
  urepSchema: 'same-major',
  extensionApi: 'same-major',
  deepImports: 'unsupported',
  browserGlobals: 'internal-compatibility-only',
});

function getRuntimeIntelligenceApiContract() {
  return Object.freeze({
    apiVersion: RUNTIME_INTELLIGENCE_API_VERSION,
    publicPackageSurfaces: PUBLIC_PACKAGE_SURFACES,
    compatibility: PUBLIC_API_COMPATIBILITY,
  });
}

export {
  PUBLIC_API_COMPATIBILITY,
  PUBLIC_PACKAGE_SURFACES,
  RUNTIME_INTELLIGENCE_API_VERSION,
  getRuntimeIntelligenceApiContract,
};
