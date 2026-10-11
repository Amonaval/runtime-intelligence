// Presentation only: never changes evidence levels or source selection.
const SOURCE_MEANINGS = Object.freeze({
  invocation: 'The observed operation was invoked at this location.',
  registration: 'The effect, listener or resource was registered at this location.',
  'error-origin': 'The captured error stack resolves to this location.',
  'component-definition': 'Framework metadata identifies this component definition.',
  'component-registration': 'Instrumentation identifies this component boundary; it does not identify every child render.',
  'common-origin': 'Multiple observed requests share this application caller.',
});

export function findingDeveloperGuidance(item, { framework = 'unknown' } = {}) {
  const source = item.sourceLocation || item.source;
  const provenance = item.sourceProvenance || item.payload?.sourceProvenance;
  const kind = item.issueType || item.kind;
  const level = item.evidenceLevel || item.evidence?.level || 'observation';
  let whySource = source?.file
    ? SOURCE_MEANINGS[provenance?.kind] || 'This location is related runtime context; its causal role is unproven.'
    : 'Source unavailable: the captured evidence does not identify a reliable application location.';
  if (source?.file && ['module-location', 'generated-runtime'].includes(provenance?.precision)) {
    whySource += ' Coordinates refer to generated code; verify original lines with your build/source maps.';
  }
  if (item.sourceMatch === 'latest-matching-event') {
    whySource += ' Selected from the latest matching owner/event; it may not explain every occurrence in this finding.';
  }
  const render = ['slow-render', 'high-avg-tti', 'render-storm', 'property-thrash', 'update-budget-opportunity'].includes(kind);
  const resource = ['resource-outlived-owner', 'resource-lifetime-violation', 'memory-leak'].includes(kind);
  let adoptionLevel = 0;
  let whatNext = source?.file
    ? 'Open this location, reproduce the same interaction, and compare evidence before and after one change.'
    : 'Reproduce one interaction and inspect its network/error timeline before adding instrumentation.';
  if (render && !source?.file) {
    adoptionLevel = 1;
    whatNext = framework === 'react'
      ? 'Add one named RuntimeIntelligenceProfiler or withRuntimeIntelligence boundary around the suspected subtree, then repeat the interaction.'
      : framework === 'vue'
        ? 'Check the component filter and available __file metadata; use a sourceResolver only for trustworthy project metadata, then repeat the interaction.'
        : framework === 'lit'
          ? 'Check that the suspected element extends the instrumented shared base and connected after activation, then repeat the interaction.'
          : 'Add one supported framework ownership boundary around the suspected area, then repeat the interaction.';
  } else if (resource) {
    adoptionLevel = 2;
    whatNext = framework === 'react'
      ? 'Inspect effect cleanup; track only the suspected resource with useRuntimeResource, then mount/unmount and check matched acquire/release evidence.'
      : 'Inspect owner teardown and track the suspected resource with explicit acquire/release evidence, then repeat mount/unmount.';
  }
  return Object.freeze({
    whySource,
    whatNext,
    adoptionLevel,
    evidenceLimit: level === 'retainer-confirmed'
      ? 'Confirmed retention applies to the measured retainer relationship; it does not establish the business root cause.'
      : level === 'causality-confirmed'
        ? 'A causal claim applies only to the relationship established by this evidence; verify the proposed fix separately.'
        : `${level}: observation, source attribution and correlation do not by themselves prove the business root cause.`,
  });
}
