import { createPrivacyPolicy, sanitizeForExportWithAudit } from '../core/enterprise-privacy.js';
// Reports preserve the store's bounded 1000-event default while scrubbing every
// exported branch. Larger custom stores have explicit truncation audit metadata.
const REPORT_POLICY = createPrivacyPolicy({ maxKeys: 1000, maxDepth: 16, maxString: 2048 });
function freezeExport(value) {
  if (!value || typeof value !== 'object') return value;
  for (const child of Object.values(value)) freezeExport(child);
  return Object.freeze(value);
}
function sanitizeRuntimeReport(report) {
  const { value, audit } = sanitizeForExportWithAudit(report, REPORT_POLICY);
  return freezeExport({ ...value, exportPrivacy: audit });
}

// Raw interception stacks are transient collector inputs, not export fields.
// Useful, bounded application provenance is retained separately in UREP.
function shapeLegacyRuntimeReport(report = {}) {
  const withoutRawStack = entries => Array.isArray(entries)
    ? entries.map(entry => {
      if (!entry || typeof entry !== 'object') return entry;
      const { callStack, ...exported } = entry;
      return exported;
    })
    : entries;
  return sanitizeRuntimeReport({
    ...report,
    ...(report.console ? { console: withoutRawStack(report.console) } : {}),
    ...(report.network ? { network: withoutRawStack(report.network) } : {}),
  });
}

export { shapeLegacyRuntimeReport, sanitizeRuntimeReport };
