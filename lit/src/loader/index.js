/**
 * Production-safe conditional loading boundary.
 *
 * This module intentionally has no static imports from Runtime Intelligence.
 * Keep it safe to include in an always-loaded production bundle; the heavier
 * framework/panel modules are imported only after an explicit `enabled: true`.
 */

const DEFAULT_LOADERS = Object.freeze({
  core: () => import('../core/index.js'),
  react: () => import('../react/index.js'),
  lit: () => import('../lit/index.js'),
  vue: () => import('../vue/index.js'),
  panel: () => import('../panel/index.js'),
});

function isRuntimeIntelligenceEnabled(value) {
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

function createRuntimeIntelligenceLoader({ loaders = DEFAULT_LOADERS } = {}) {
  if (!loaders || typeof loaders !== 'object') {
    throw new TypeError('createRuntimeIntelligenceLoader requires a loader map.');
  }

  return async function loadRuntimeIntelligence({
    enabled = false,
    framework = 'core',
    panel = false,
  } = {}) {
    if (!isRuntimeIntelligenceEnabled(enabled)) return _disabledResult();

    const loadFramework = loaders[framework];
    if (typeof loadFramework !== 'function' || framework === 'panel') {
      throw new TypeError(`Unsupported Runtime Intelligence framework: ${framework}`);
    }

    const frameworkPromise = loadFramework();
    const panelPromise = panel === true
      ? (typeof loaders.panel === 'function'
        ? loaders.panel()
        : Promise.reject(new TypeError('Runtime Intelligence panel loader is unavailable.')))
      : Promise.resolve(null);

    const [frameworkModule, panelModule] = await Promise.all([
      frameworkPromise,
      panelPromise,
    ]);

    return Object.freeze({
      enabled: true,
      framework,
      frameworkModule,
      panelModule,
    });
  };
}

const loadRuntimeIntelligence = createRuntimeIntelligenceLoader();

export {
  createRuntimeIntelligenceLoader,
  isRuntimeIntelligenceEnabled,
  loadRuntimeIntelligence,
};
