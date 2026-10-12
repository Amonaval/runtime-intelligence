/**
 * Lit-specific production-safe loading boundary.
 *
 * Keep this entrypoint free of React/Vue imports so Lit-only bundlers never
 * have to resolve optional peers for frameworks the application does not use.
 */
const LIT_LOADERS = Object.freeze({
  lit: () => import('../lit/index.js'),
  panel: () => import('../panel/index.js'),
});

function isLitRuntimeIntelligenceEnabled(value) {
  return value === true;
}

function _disabledResult() {
  return Object.freeze({
    enabled: false,
    framework: null,
    frameworkModule: null,
    panelModule: null,
  });
}

async function loadLitRuntimeIntelligence({
  enabled = false,
  panel = false,
} = {}) {
  if (!isLitRuntimeIntelligenceEnabled(enabled)) return _disabledResult();

  const frameworkPromise = LIT_LOADERS.lit();
  const panelPromise = panel === true ? LIT_LOADERS.panel() : Promise.resolve(null);
  const [frameworkModule, panelModule] = await Promise.all([frameworkPromise, panelPromise]);

  return Object.freeze({
    enabled: true,
    framework: 'lit',
    frameworkModule,
    panelModule,
  });
}

export {
  isLitRuntimeIntelligenceEnabled,
  loadLitRuntimeIntelligence,
};
