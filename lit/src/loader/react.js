/**
 * React-specific production-safe loading boundary.
 *
 * Keep this entrypoint free of Vue/Lit framework imports so React-only
 * bundlers never have to resolve optional peers for frameworks the
 * application does not use. The shared panel remains allowed.
 */
const REACT_LOADERS = Object.freeze({
  react: () => import('../react/index.js'),
  panel: () => import('../panel/index.js'),
});

function isReactRuntimeIntelligenceEnabled(value) {
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

async function loadReactRuntimeIntelligence({
  enabled = false,
  panel = false,
} = {}) {
  if (!isReactRuntimeIntelligenceEnabled(enabled)) return _disabledResult();

  const frameworkPromise = REACT_LOADERS.react();
  const panelPromise = panel === true ? REACT_LOADERS.panel() : Promise.resolve(null);
  const [frameworkModule, panelModule] = await Promise.all([frameworkPromise, panelPromise]);

  return Object.freeze({
    enabled: true,
    framework: 'react',
    frameworkModule,
    panelModule,
  });
}

export {
  isReactRuntimeIntelligenceEnabled,
  loadReactRuntimeIntelligence,
};
