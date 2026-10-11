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
  return {
    ...report,
    ...(report.console ? { console: withoutRawStack(report.console) } : {}),
    ...(report.network ? { network: withoutRawStack(report.network) } : {}),
  };
}

export { shapeLegacyRuntimeReport };
