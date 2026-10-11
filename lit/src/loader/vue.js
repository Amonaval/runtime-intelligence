/**
 * Vue-specific production-safe loading boundary.
 *
 * Keep this entrypoint free of React/Lit imports so Vue-only bundlers never
 * have to resolve optional peers for frameworks the application does not use.
 */
const VUE_LOADERS = Object.freeze({
  vue: () => import('../vue/index.js'),
  panel: () => import('../panel/index.js'),
});

function isVueRuntimeIntelligenceEnabled(value) {
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

async function loadVueRuntimeIntelligence({
  enabled = false,
  panel = false,
} = {}) {
  if (!isVueRuntimeIntelligenceEnabled(enabled)) return _disabledResult();

  const frameworkPromise = VUE_LOADERS.vue();
  const panelPromise = panel === true ? VUE_LOADERS.panel() : Promise.resolve(null);
  const [frameworkModule, panelModule] = await Promise.all([frameworkPromise, panelPromise]);

  return Object.freeze({
    enabled: true,
    framework: 'vue',
    frameworkModule,
    panelModule,
  });
}

export {
  isVueRuntimeIntelligenceEnabled,
  loadVueRuntimeIntelligence,
};
