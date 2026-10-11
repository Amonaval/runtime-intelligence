import { loadRuntimeIntelligence } from 'runtime-intelligence/loader';
window.r8DisabledResult = await loadRuntimeIntelligence({ enabled: false, framework: 'react', panel: true });
