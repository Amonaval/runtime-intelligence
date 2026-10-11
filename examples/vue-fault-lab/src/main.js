import { createApp, h } from 'vue';
import { loadVueRuntimeIntelligence } from 'runtime-intelligence/loader/vue';
import { injectFullCoveragePack } from './injected-scenarios.js';
import './styles.css';

const SOURCE = 'examples/vue-fault-lab/src/main.js';
let diagnosticsController = null;
let panelController = null;

function burn(ms) {
  const start = performance.now();
  while (performance.now() - start < ms) {
    Math.sqrt(Math.random() * 100000);
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function clickFault(id) {
  const element = document.querySelector(`[data-fault-action="${id}"]`);
  if (!element) throw new Error(`Fault Lab action not found: ${id}`);
  element.click();
}

function componentName(proxy) {
  const type = proxy?.$?.type || null;
  return type?.name || type?.__name || proxy?.$options?.name || proxy?.$options?.__name || '';
}

const SlowUpdateProbe = {
  name: 'VueFaultLabSlowUpdateProbe',
  data: () => ({ count: 0, slow: false }),
  methods: {
    runSlowUpdate() {
      this.slow = true;
      this.count += 1;
      this.$nextTick(() => { this.slow = false; });
    },
    expensiveValue() {
      if (this.slow) burn(620);
      return this.count;
    },
  },
  template: `
    <button data-fault-action="slow-render" @click="runSlowUpdate">
      Trigger ~620 ms Vue update ({{ expensiveValue() }})
    </button>
  `,
};

const RenderStormProbe = {
  name: 'VueFaultLabRenderStormProbe',
  data: () => ({ value: 0, timer: null }),
  beforeUnmount() { clearInterval(this.timer); },
  methods: {
    run() {
      let count = 0;
      clearInterval(this.timer);
      this.timer = setInterval(() => {
        count += 1;
        this.value += 1;
        if (count >= 8) clearInterval(this.timer);
      }, 10);
    },
  },
  template: `<button data-fault-action="render-storm" @click="run">Run 8 updates / ~80 ms (value {{ value }})</button>`,
};

const EffectLoopProbe = {
  name: 'VueFaultLabEffectLoopProbe',
  data: () => ({ enabled: false, tick: 0 }),
  watch: {
    tick(value) {
      if (!this.enabled) return;
      if (value >= 7) {
        this.enabled = false;
        return;
      }
      queueMicrotask(() => { if (this.enabled) this.tick += 1; });
    },
  },
  methods: {
    run() {
      this.enabled = false;
      this.tick = 0;
      queueMicrotask(() => {
        this.enabled = true;
        this.tick = 1;
      });
    },
  },
  template: `<button data-fault-action="effect-loop" @click="run">Run bounded reactive feedback loop ({{ tick }})</button>`,
};

const ComponentErrorProbe = {
  name: 'VueFaultLabComponentErrorProbe',
  data: () => ({ fail: false }),
  render() {
    if (this.fail) throw new Error('Synthetic Vue Fault Lab component error');
    return h('button', {
      'data-fault-action': 'component-error',
      onClick: () => { this.fail = true; },
    }, 'Trigger controlled Vue component error');
  },
};

const BrowserErrorProbe = {
  name: 'VueFaultLabBrowserErrorProbe',
  methods: {
    run() { Promise.reject(new Error('Vue Fault Lab unhandled rejection')); },
  },
  template: `<button data-fault-action="browser-error" @click="run">Trigger unhandled browser rejection</button>`,
};

const ConsoleNoiseProbe = {
  name: 'VueFaultLabConsoleNoiseProbe',
  methods: {
    run() {
      console.warn('Vue Fault Lab warning: repeated runtime warning');
      console.error('Vue Fault Lab console error: validation signal');
      console.warn('Vue Fault Lab warning: repeated runtime warning');
    },
  },
  template: `<button data-fault-action="console-noise" @click="run">Emit console warnings + error</button>`,
};

const NetworkProbe = {
  name: 'VueFaultLabNetworkProbe',
  data: () => ({ status: 'idle' }),
  methods: {
    async runSlow() {
      this.status = 'slow request running…';
      await fetch('/api/fault-lab/slow?ms=2200');
      this.status = 'slow request complete';
    },
    async runError() {
      this.status = 'error request running…';
      await fetch('/api/fault-lab/error');
      this.status = '503 captured';
    },
    async runSequential() {
      this.status = 'sequential requests running…';
      for (let i = 0; i < 3; i += 1) {
        await fetch(`/api/fault-lab/fast?ms=90&i=${i}`);
      }
      this.status = '3 sequential requests complete';
    },
    async runWorkerCandidate() {
      this.status = 'large response + long task running…';
      const response = await fetch('/api/fault-lab/large');
      await response.text();
      burn(180);
      this.status = 'large response + 180 ms task complete';
    },
  },
  template: `
    <div class="scenario-actions">
      <button data-fault-action="slow-api" @click="runSlow">Slow API &gt;2s</button>
      <button data-fault-action="http-503" @click="runError">HTTP 503</button>
      <button data-fault-action="sequential-api" @click="runSequential">3 sequential APIs</button>
      <button data-fault-action="worker-candidate" @click="runWorkerCandidate">Large response + 180 ms task</button>
      <span class="inline-status">{{ status }}</span>
    </div>
  `,
};

const XhrProbe = {
  name: 'VueFaultLabXhrProbe',
  data: () => ({ status: 'idle' }),
  methods: {
    run() {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/fault-lab/error');
      xhr.addEventListener('loadend', () => { this.status = `XHR status ${xhr.status}`; });
      xhr.send();
    },
  },
  template: `
    <div class="scenario-actions">
      <button data-fault-action="xhr-error" @click="run">XHR 503 failure</button>
      <span class="inline-status">{{ status }}</span>
    </div>
  `,
};

const DuplicateDomProbe = {
  name: 'VueFaultLabDuplicateDomProbe',
  data: () => ({ visible: false }),
  template: `
    <div class="scenario-actions">
      <button data-fault-action="dom-duplication" @click="visible = !visible">{{ visible ? 'Remove' : 'Create' }} 4 duplicate dialogs</button>
      <div v-if="visible" class="fault-stage compact-stage">
        <div v-for="i in 4" :key="i" role="dialog" class="fake-dialog">Duplicate modal body</div>
      </div>
    </div>
  `,
};

const VirtualizationProbe = {
  name: 'VueFaultLabVirtualizationProbe',
  data: () => ({ visible: false }),
  template: `
    <div class="scenario-actions">
      <button data-fault-action="virtualization" @click="visible = !visible">{{ visible ? 'Remove' : 'Render' }} 120 unvirtualized rows</button>
      <div v-if="visible" class="fault-stage long-list">
        <div v-for="i in 120" :key="i" class="lab-row">Row {{ i }}</div>
      </div>
    </div>
  `,
};

const LargeDomProbe = {
  name: 'VueFaultLabLargeDomProbe',
  data: () => ({ visible: false }),
  template: `
    <div class="scenario-actions">
      <button data-fault-action="large-dom" @click="visible = !visible">{{ visible ? 'Remove' : 'Create' }} ~1800 extra DOM nodes</button>
      <div v-if="visible" class="large-dom-stage"><span v-for="i in 1800" :key="i">.</span></div>
    </div>
  `,
};

const ExpensiveCssProbe = {
  name: 'VueFaultLabExpensiveCssProbe',
  data: () => ({ visible: false }),
  template: `
    <div class="scenario-actions">
      <button data-fault-action="expensive-css" @click="visible = !visible">{{ visible ? 'Remove' : 'Create' }} 20 heavy box shadows</button>
      <div v-if="visible" class="paint-grid"><div v-for="i in 20" :key="i" class="paint-card">Paint {{ i }}</div></div>
      <span class="inline-status">Behavioral paint scan can be timing-sensitive; deterministic injection guarantees report coverage too.</span>
    </div>
  `,
};

const ResourceProbe = {
  name: 'VueFaultLabResourceProbe',
  props: { leak: { type: Boolean, default: false } },
  data() {
    return {
      resourceId: `fault-lab-timer-${Math.random().toString(36).slice(2)}`,
      timer: null,
    };
  },
  mounted() {
    this.timer = setInterval(() => {}, 10000);
    diagnosticsController?.adapter?.recordResourceAcquired(this, {
      resourceId: this.resourceId,
      resourceType: 'interval',
      source: { file: SOURCE },
    });
  },
  unmounted() {
    clearInterval(this.timer);
    if (this.leak) return;
    diagnosticsController?.adapter?.recordResourceReleased(this, {
      resourceId: this.resourceId,
      resourceType: 'interval',
      source: { file: SOURCE },
    });
  },
  template: `<div class="resource-probe"><strong>{{ leak ? 'Tracked leak scenario' : 'Tracked cleanup scenario' }}</strong><span>{{ resourceId }}</span></div>`,
};

const ResourceLifetimeProbe = {
  name: 'VueFaultLabResourceLifetimeProbe',
  components: { ResourceProbe },
  data: () => ({ mounted: false }),
  template: `
    <div class="scenario-actions">
      <button data-fault-action="resource-lifetime" @click="mounted = !mounted">{{ mounted ? 'Unmount leaked owner' : 'Mount tracked resource' }}</button>
      <ResourceProbe v-if="mounted" :leak="true" />
    </div>
  `,
};

const CleanResourceProbe = {
  name: 'VueFaultLabCleanResourceProbe',
  components: { ResourceProbe },
  data: () => ({ mounted: false }),
  template: `
    <div class="scenario-actions">
      <button @click="mounted = !mounted">{{ mounted ? 'Unmount clean resource' : 'Mount clean resource' }}</button>
      <ResourceProbe v-if="mounted" :leak="false" />
    </div>
  `,
};

const RetainedChild = {
  name: 'VueFaultLabRetainedChild',
  props: { index: Number },
  template: `<div class="retained-child">Retained child {{ index + 1 }}</div>`,
};

const MountStormProbe = {
  name: 'VueFaultLabMountStormProbe',
  components: { RetainedChild },
  data: () => ({ count: 0 }),
  methods: { run() { this.count = 6; } },
  template: `
    <div class="scenario-actions">
      <button data-fault-action="mount-storm" @click="run">Mount 6 retained component owners</button>
      <div class="retained-grid"><RetainedChild v-for="i in count" :key="i" :index="i - 1" /></div>
    </div>
  `,
};

const InjectedCoverageProbe = {
  name: 'VueFaultLabInjectedCoverageProbe',
  data: () => ({ expected: [] }),
  methods: {
    run() {
      const result = injectFullCoveragePack(diagnosticsController.store);
      this.expected = result.expected;
      return result;
    },
  },
  template: `
    <div class="scenario-actions">
      <button data-fault-action="injected-pack" class="injected-button" @click="run">Inject deterministic full-coverage pack</button>
      <span v-if="expected.length" class="inline-status">Expected: {{ expected.join(' · ') }}</span>
    </div>
  `,
};

const ScenarioCard = {
  name: 'VueFaultLabUIScenarioCard',
  props: {
    title: String,
    description: String,
    kind: { type: String, default: 'behavioral' },
  },
  template: `
    <article class="scenario-card">
      <div class="scenario-heading">
        <div><span class="kind" :class="{ injected: kind === 'injected' }">{{ kind }}</span><h3>{{ title }}</h3></div>
      </div>
      <p>{{ description }}</p>
      <div class="scenario-actions"><slot /></div>
    </article>
  `,
};

const COVERAGE_CHECKS = Object.freeze([
  ['Owner lifecycle', events => events.some(event => event.type === 'owner.created') && events.some(event => event.type === 'owner.destroyed')],
  ['Vue update timing', events => events.some(event => event.type === 'component.update.completed')],
  ['Runtime error', events => events.some(event => event.type === 'error')],
  ['Network evidence', events => events.some(event => event.type === 'network.completed')],
  ['Resource ownership', events => events.some(event => event.type === 'resource.acquired')],
  ['Resource lifetime violation', events => events.some(event => event.payload?.resourceLifetimeViolation === true)],
  ['Update budget', events => events.some(event => event.payload?.budgetViolation === true)],
  ['Sequential API', events => events.some(event => event.payload?.sequentialApiOpportunity === true)],
  ['DOM duplication', events => events.some(event => event.payload?.domDuplication === true)],
  ['Virtualization', events => events.some(event => event.payload?.virtualizationOpportunity === true)],
  ['Expensive paint', events => events.some(event => event.payload?.expensivePaint === true)],
  ['Worker opportunity', events => events.some(event => event.payload?.workerOpportunity === true)],
  ['Idle opportunity', events => events.some(event => event.payload?.idleOpportunity === true)],
  ['Network correlation', events => events.some(event => event.payload?.networkCorrelation === true)],
  ['Evidence capsule', () => Boolean(window.__LDS_INTELLIGENCE_PIPELINE__?.exportCapsule?.())],
]);

const App = {
  name: 'VueFaultLabUIRoot',
  components: {
    ScenarioCard,
    SlowUpdateProbe,
    RenderStormProbe,
    EffectLoopProbe,
    ComponentErrorProbe,
    BrowserErrorProbe,
    ConsoleNoiseProbe,
    NetworkProbe,
    XhrProbe,
    DuplicateDomProbe,
    VirtualizationProbe,
    LargeDomProbe,
    ExpensiveCssProbe,
    ResourceLifetimeProbe,
    CleanResourceProbe,
    MountStormProbe,
    InjectedCoverageProbe,
  },
  data: () => ({
    events: [],
    status: 'Ready',
    running: false,
    report: null,
    unsubscribe: null,
    refreshQueued: false,
  }),
  computed: {
    evidenceByType() {
      const counts = {};
      for (const event of this.events) counts[event.type] = (counts[event.type] || 0) + 1;
      return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    },
    coverage() {
      return COVERAGE_CHECKS.map(([label, check]) => {
        let covered = false;
        try { covered = Boolean(check(this.events)); } catch {}
        return { label, covered };
      });
    },
    coverageCount() { return this.coverage.filter(item => item.covered).length; },
    summaryText() { return this.evidenceByType.map(([type, count]) => `${type}:${count}`).join(' · ') || 'none yet'; },
    reportJson() { return this.report ? JSON.stringify(this.report, null, 2) : ''; },
    intelligenceJson() { return this.report ? JSON.stringify({ intelligence: this.report.intelligence, evidenceCapsule: this.report.evidenceCapsule }, null, 2) : ''; },
  },
  mounted() {
    this.refreshEvidence();
    this.unsubscribe = diagnosticsController.store.subscribe(() => this.queueEvidenceRefresh());
  },
  beforeUnmount() { this.unsubscribe?.(); },
  methods: {
    queueEvidenceRefresh() {
      if (this.refreshQueued) return;
      this.refreshQueued = true;
      queueMicrotask(() => {
        this.refreshQueued = false;
        this.refreshEvidence();
      });
    },
    refreshEvidence() {
      this.events = diagnosticsController?.store?.snapshot?.() || [];
    },
    refreshReport() {
      panelController?.refresh?.();
      this.report = panelController?.createReport?.('Vue Fault Lab full-coverage validation') || null;
      this.refreshEvidence();
    },
    clearEvidence() {
      diagnosticsController.store.clear();
      this.report = null;
      this.refreshEvidence();
      this.status = 'Evidence cleared.';
    },
    exportJson() {
      this.refreshReport();
      const name = panelController?.downloadJson?.();
      this.status = name ? `Downloaded ${name}` : 'Report export is not ready yet.';
    },
    exportHtml() {
      this.refreshReport();
      const name = panelController?.downloadHtml?.();
      this.status = name ? `Downloaded ${name}` : 'Report export is not ready yet.';
    },
    resetLab() { window.location.reload(); },
    async runAll(exportAfter = false) {
      if (this.running) return;
      this.running = true;
      this.status = 'Starting all behavioral faults…';
      const immediate = [
        'slow-render',
        'render-storm',
        'effect-loop',
        'component-error',
        'browser-error',
        'console-noise',
        'slow-api',
        'http-503',
        'sequential-api',
        'worker-candidate',
        'xhr-error',
        'dom-duplication',
        'virtualization',
        'large-dom',
        'expensive-css',
        'resource-lifetime',
        'mount-storm',
      ];

      for (const id of immediate) {
        try { clickFault(id); } catch (error) { console.warn(error.message); }
      }

      try {
        this.status = 'Behavioral faults running; waiting for async/network/resource evidence…';
        await wait(500);
        try { clickFault('resource-lifetime'); } catch {}
        await wait(3300);

        this.status = 'Injecting deterministic rare-signal coverage…';
        try { clickFault('injected-pack'); } catch (error) { console.warn(error.message); }
        await wait(900);

        this.refreshReport();
        this.status = `Full pass complete: ${this.coverageCount}/${this.coverage.length} coverage checks visible.`;

        if (exportAfter) {
          const names = panelController?.downloadBoth?.();
          this.status = `Full pass complete. Export requested: ${names?.json || 'JSON'} + ${names?.html || 'HTML'}.`;
        }
      } finally {
        this.running = false;
      }
    },
  },
  template: `
    <main>
      <header class="hero">
        <div>
          <span class="eyebrow">Runtime Intelligence validation harness</span>
          <h1>Vue Fault Lab</h1>
          <p>
            Full R7 validation across Vue lifecycle evidence, shared browser diagnostics, deterministic rare-signal coverage,
            the canonical panel and normalized JSON/HTML reports. Vue evidence remains honest: update lifecycle/timing is observed,
            while reactive cause/dependency is not invented.
          </p>
        </div>
      </header>

      <section class="lab-controls">
        <div>
          <strong>One-pass validation</strong>
          <div class="control-note">Run every supported behavioral fault, inject deterministic rare-signal evidence, refresh the canonical panel, show the normalized report below, and optionally export JSON + HTML.</div>
        </div>
        <div class="control-actions">
          <button :disabled="running" @click="runAll(false)">{{ running ? 'Running…' : 'Run all faults' }}</button>
          <button class="primary" :disabled="running" @click="runAll(true)">{{ running ? 'Running…' : 'Run all + export JSON + HTML' }}</button>
          <button class="secondary" :disabled="running" @click="refreshReport">Refresh report</button>
          <button class="secondary" :disabled="running" @click="exportJson">Export JSON</button>
          <button class="secondary" :disabled="running" @click="exportHtml">Export HTML</button>
          <button class="ghost" :disabled="running" @click="clearEvidence">Clear evidence</button>
          <button class="ghost" :disabled="running" @click="resetLab">Reset lab</button>
        </div>
        <div class="control-status">{{ status }}</div>
      </section>

      <section class="evidence-summary">
        <div>
          <strong>{{ events.length }}</strong> UREP events
          <span class="summary-detail">{{ summaryText }}</span>
        </div>
        <div class="coverage-score"><strong>{{ coverageCount }}/{{ coverage.length }}</strong><span>coverage checks</span></div>
      </section>

      <section class="coverage-panel">
        <div class="section-heading compact"><div><h2>Coverage matrix</h2><p>Green means the current session/report contains that evidence path. Synthetic coverage is explicitly marked in the underlying evidence payload.</p></div></div>
        <div class="coverage-grid">
          <div v-for="item in coverage" :key="item.label" class="coverage-item" :class="{ covered: item.covered }">
            <span class="coverage-dot">{{ item.covered ? '✓' : '○' }}</span><span>{{ item.label }}</span>
          </div>
        </div>
      </section>

      <section class="section-heading">
        <h2>Behavioral faults</h2>
        <p>These create real Vue/browser behavior. Detection strength depends on the evidence surface available to Vue and the browser.</p>
      </section>
      <div class="scenario-grid">
        <ScenarioCard title="Slow Vue update" description="A ~620 ms Vue beforeUpdate → updated window exercises slow-update intelligence without claiming a reactive cause."><SlowUpdateProbe /></ScenarioCard>
        <ScenarioCard title="Update storm" description="Eight updates in a short window exercise lifecycle volume and update-budget logic."><RenderStormProbe /></ScenarioCard>
        <ScenarioCard title="Bounded reactive feedback loop" description="Seven safe chained updates exercise repeated lifecycle evidence without leaving the app stuck."><EffectLoopProbe /></ScenarioCard>
        <ScenarioCard title="Vue component error" description="Throws from a child render path so Vue error observation can be validated without replacing Vue default error behavior."><ComponentErrorProbe /></ScenarioCard>
        <ScenarioCard title="Unhandled browser rejection" description="Exercises shared browser error capture independently of Vue component error handling."><BrowserErrorProbe /></ScenarioCard>
        <ScenarioCard title="Console warnings + error" description="Exercises page-level console capture and presentation."><ConsoleNoiseProbe /></ScenarioCard>
        <ScenarioCard title="Fetch/network intelligence" description="Slow, failed, sequential and large-response calls exercise network and optimization paths."><NetworkProbe /></ScenarioCard>
        <ScenarioCard title="XHR failure" description="Exercises XMLHttpRequest interception separately from fetch."><XhrProbe /></ScenarioCard>
        <ScenarioCard title="Duplicate singleton DOM" description="Four dialog-role elements exercise likely duplicate singleton detection."><DuplicateDomProbe /></ScenarioCard>
        <ScenarioCard title="Missing virtualization" description="120 sibling rows create a high off-screen ratio for virtualization analysis."><VirtualizationProbe /></ScenarioCard>
        <ScenarioCard title="Oversized DOM" description="Adds ~1800 nodes so mature health scoring and DOM guidance can be exercised."><LargeDomProbe /></ScenarioCard>
        <ScenarioCard title="Expensive paint pattern" description="Creates repeated box shadows for paint analysis; deterministic injection backs up timing-sensitive browser scans."><ExpensiveCssProbe /></ScenarioCard>
        <ScenarioCard title="Resource lifetime violation" description="Acquires a tracked interval and deliberately omits release evidence before owner destruction; the real timer is still cleared safely."><ResourceLifetimeProbe /></ScenarioCard>
        <ScenarioCard title="Correct resource cleanup" description="Control case proving the same explicit resource path can be released cleanly."><CleanResourceProbe /></ScenarioCard>
        <ScenarioCard title="Retained owner / mount spike" description="Mounts six same-name Vue owners and keeps them active to exercise owner/memory heuristics."><MountStormProbe /></ScenarioCard>
      </div>

      <section class="section-heading synthetic-heading">
        <h2>Deterministic evidence injection</h2>
        <p>Rare or timing-sensitive product paths are injected as synthetic UREP and remain explicitly labeled synthetic in the report.</p>
      </section>
      <div class="scenario-grid">
        <ScenarioCard title="Full normalized coverage pack" kind="injected" description="Covers slow render, state/property thrash, network failure, opportunities, runtime error, resource-lifetime provenance, retained owners, Intelligence and the evidence capsule."><InjectedCoverageProbe /></ScenarioCard>
      </div>

      <section class="section-heading report-heading">
        <h2>Normalized report preview</h2>
        <p>After <strong>Run all faults</strong>, the same report contract used by JSON/HTML export is visible here for screenshot/review.</p>
      </section>
      <section class="report-preview" v-if="report">
        <div class="report-kpis">
          <div><strong>{{ report.summary?.evidenceCount || 0 }}</strong><span>evidence</span></div>
          <div><strong>{{ report.summary?.diagnosticCount || 0 }}</strong><span>diagnostics</span></div>
          <div><strong>{{ report.summary?.opportunityCount || 0 }}</strong><span>unique opportunities</span></div>
          <div><strong>{{ report.summary?.normalizedFindingCount || 0 }}</strong><span>unique findings</span></div>
        </div>
        <div class="report-columns">
          <div class="report-list">
            <h3>Findings</h3>
            <div v-if="!report.normalizedFindings?.length" class="empty-state">No normalized findings yet.</div>
            <div v-for="finding in report.normalizedFindings" :key="finding.id + ':' + finding.kind" class="report-row">
              <span class="report-kind">{{ finding.kind }}</span>
              <strong>{{ finding.owner?.name || finding.owner?.id || 'runtime' }}</strong>
              <small>{{ finding.synthetic ? 'synthetic' : 'observed' }} · {{ finding.evidence?.level || 'n/a' }} · x{{ finding.occurrenceCount || 1 }}</small>
            </div>
          </div>
          <div class="report-list">
            <h3>Opportunities</h3>
            <div v-if="!report.opportunities?.length" class="empty-state">No opportunities yet.</div>
            <div v-for="item in report.opportunities" :key="item.id + ':' + item.kind" class="report-row">
              <span class="report-kind opportunity">{{ item.kind }}</span>
              <strong>{{ item.owner?.name || item.owner?.id || 'runtime' }}</strong>
              <small>{{ item.synthetic ? 'synthetic' : 'observed' }} · {{ item.evidence?.level || 'n/a' }} · x{{ item.occurrenceCount || 1 }}</small>
            </div>
          </div>
        </div>
        <details open><summary>Intelligence + evidence capsule</summary><pre>{{ intelligenceJson }}</pre></details>
        <details><summary>Complete normalized JSON report</summary><pre>{{ reportJson }}</pre></details>
      </section>
      <section class="report-preview empty-report" v-else>
        Run all faults or click <strong>Refresh report</strong> to render the normalized report here.
      </section>

      <footer>
        Recommended closure path: <strong>Run all faults</strong> → verify the coverage matrix/report preview → export JSON + HTML → share the JSON/screenshot for final R7 review. Behavioral and synthetic evidence stay distinguishable throughout.
      </footer>
    </main>
  `,
};

async function bootstrap() {
  const loaded = await loadVueRuntimeIntelligence({ enabled: true, panel: true });
  const app = createApp(App);

  diagnosticsController = loaded.frameworkModule.installVueRuntimeIntelligence(app, {
    enabled: true,
    version: '3.x',
    slowRenderThresholdMs: 100,
    componentFilter: proxy => !componentName(proxy).startsWith('VueFaultLabUI'),
  });

  panelController = loaded.panelModule.mountRuntimeIntelligencePanel({
    store: diagnosticsController.store,
    collapsed: false,
  });

  app.mount('#app');

  window.__RUNTIME_INTELLIGENCE_VUE_FAULT_LAB__ = Object.freeze({
    synthetic: true,
    runtime: diagnosticsController.runtime,
    controller: diagnosticsController,
    panel: panelController,
  });
}

bootstrap().catch(error => {
  console.error('Vue Fault Lab bootstrap failed', error);
  const target = document.getElementById('app');
  if (target) target.innerHTML = `<pre class="bootstrap-error">Vue Fault Lab bootstrap failed: ${String(error?.stack || error)}</pre>`;
});
