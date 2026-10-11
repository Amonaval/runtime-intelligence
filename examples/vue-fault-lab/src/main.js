import { createApp, h } from 'vue';
import { loadRuntimeIntelligence } from 'runtime-intelligence/loader';
import './styles.css';

function burnCpu(ms = 130) {
  const start = performance.now();
  let value = 0;
  while (performance.now() - start < ms) {
    value += Math.sqrt(value + 1);
  }
  return value;
}

let diagnosticsController = null;

const SlowUpdateProbe = {
  name: 'VueFaultLabSlowUpdateProbe',
  data: () => ({ count: 0 }),
  methods: {
    runSlowUpdate() {
      this.count += 1;
    },
    expensiveValue() {
      burnCpu(130);
      return this.count;
    },
  },
  template: `
    <section class="card">
      <h2>Expensive update</h2>
      <p>Measured through Vue beforeUpdate → updated. It is an observation, not a claimed cause.</p>
      <button @click="runSlowUpdate">Run slow update</button>
      <output>render {{ expensiveValue() }}</output>
    </section>
  `,
};

const ErrorProbe = {
  name: 'VueFaultLabErrorProbe',
  data: () => ({ fail: false }),
  render() {
    if (this.fail) {
      throw new Error('Synthetic Vue Fault Lab component error');
    }
    return h('section', { class: 'card' }, [
      h('h2', 'Controlled component error'),
      h('p', 'The Vue app errorHandler reports this as observed error evidence.'),
      h('button', { onClick: () => { this.fail = true; } }, 'Trigger component error'),
    ]);
  },
};

const ResourceProbe = {
  name: 'VueFaultLabResourceProbe',
  props: { leak: { type: Boolean, default: false } },
  data() {
    return { resourceId: `fault-lab-timer-${Math.random().toString(36).slice(2)}` };
  },
  mounted() {
    diagnosticsController?.adapter?.recordResourceAcquired(this, {
      resourceId: this.resourceId,
      resourceType: 'interval',
      source: { file: 'examples/vue-fault-lab/src/main.js' },
    });
  },
  unmounted() {
    if (this.leak) return;
    diagnosticsController?.adapter?.recordResourceReleased(this, {
      resourceId: this.resourceId,
      resourceType: 'interval',
      source: { file: 'examples/vue-fault-lab/src/main.js' },
    });
  },
  template: `
    <section class="resource-probe">
      <strong>{{ leak ? 'Explicit leak scenario' : 'Explicit cleanup scenario' }}</strong>
      <span>{{ resourceId }}</span>
    </section>
  `,
};

const NetworkProbe = {
  name: 'VueFaultLabNetworkProbe',
  data: () => ({ status: 'idle' }),
  methods: {
    async runSlowFetch() {
      this.status = 'loading';
      try {
        const response = await fetch('/api/fault-lab/slow?ms=350');
        const body = await response.json();
        this.status = `done (${body.delayedMs}ms)`;
      } catch (error) {
        this.status = `failed: ${error?.message || error}`;
      }
    },
  },
  template: `
    <section class="card">
      <h2>Interaction + network correlation</h2>
      <p>Correlation is temporal/contextual evidence only; it is not promoted to causality.</p>
      <button @click="runSlowFetch">Run slow local request</button>
      <output>{{ status }}</output>
    </section>
  `,
};

const App = {
  name: 'VueFaultLabApp',
  components: { SlowUpdateProbe, ErrorProbe, ResourceProbe, NetworkProbe },
  data: () => ({
    repeated: 0,
    showCleanResource: false,
    showLeakyResource: false,
  }),
  methods: {
    runRepeatedUpdates() {
      let remaining = 6;
      const next = () => {
        this.repeated += 1;
        remaining -= 1;
        if (remaining > 0) queueMicrotask(next);
      };
      next();
    },
  },
  template: `
    <main>
      <header>
        <p class="eyebrow">Synthetic validation only</p>
        <h1>Vue Fault Lab</h1>
        <p>R7 validates Vue → UREP → shared intelligence → the same canonical panel.</p>
      </header>

      <SlowUpdateProbe />
      <ErrorProbe />
      <NetworkProbe />

      <section class="card">
        <h2>Repeated updates</h2>
        <p>Produces repeated update observations without inventing an update cause.</p>
        <button @click="runRepeatedUpdates">Run 6 updates</button>
        <output>{{ repeated }}</output>
      </section>

      <section class="card">
        <h2>Explicit resource ownership</h2>
        <p>Mount/unmount a correctly cleaned resource or an intentionally leaked one.</p>
        <div class="actions">
          <button @click="showCleanResource = !showCleanResource">Toggle clean resource</button>
          <button @click="showLeakyResource = !showLeakyResource">Toggle leaky resource</button>
        </div>
        <ResourceProbe v-if="showCleanResource" :leak="false" />
        <ResourceProbe v-if="showLeakyResource" :leak="true" />
      </section>
    </main>
  `,
};

const loaded = await loadRuntimeIntelligence({
  enabled: true,
  framework: 'vue',
  panel: true,
});

const app = createApp(App);
diagnosticsController = loaded.frameworkModule.installVueRuntimeIntelligence(app, {
  enabled: true,
  version: '3.x',
  slowRenderThresholdMs: 100,
});

const panel = loaded.panelModule.mountRuntimeIntelligencePanel({
  store: diagnosticsController.store,
});

app.mount('#app');

window.__RUNTIME_INTELLIGENCE_VUE_FAULT_LAB__ = Object.freeze({
  synthetic: true,
  runtime: diagnosticsController.runtime,
  controller: diagnosticsController,
  panel,
});
