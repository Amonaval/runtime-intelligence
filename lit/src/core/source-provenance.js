import { parseRuntimeSourceLocation } from './source-resolver.js';

const SourceProvenanceKind = Object.freeze({
  INVOCATION: 'invocation',
  REGISTRATION: 'registration',
  ERROR_ORIGIN: 'error-origin',
  COMPONENT_DEFINITION: 'component-definition',
  COMMON_ORIGIN: 'common-origin',
  RELATED: 'related',
});

const DEFAULT_SKIP_PATTERNS = Object.freeze([
  '/node_modules/',
  'node_modules/',
  'react-dom',
  'react.development',
  'react.production',
  '/scheduler/',
  'next/dist/',
  'node:internal',
  '@vite/client',
  '/vite/dist/',
  'webpack/runtime',
  'webpack/bootstrap',
  'source-provenance.js',
  'browser-runtime-surface.js',
  '/core/network.js',
  'sequential-api-detector.js',
]);

function _firefoxToV8(line) {
  const match = String(line || '').trim().match(/^(.*?)@(.+?:\d+:\d+)$/);
  if (!match) return line;
  const fn = match[1]?.trim();
  return fn ? `at ${fn} (${match[2]})` : `at ${match[2]}`;
}

function _projectFacingFile(file) {
  const normalized = String(file || '')
    .replace(/^\((?:app-pages-browser|pages-browser|app-pages-server|rsc)\)\/\.\//i, '')
    .replace(/^(?:_N_E|webpack)\/\.\//i, '')
    .replace(/^\.\//, '');
  if (/^(?:blob:|data:)/i.test(normalized)) return normalized;
  if (/^https?:/i.test(normalized)) {
    try {
      const url = new URL(normalized);
      if (/\/(?:_next|static\/chunks|assets)\//i.test(url.pathname)) return normalized;
      const sourceMarker = url.pathname.match(/(?:^|\/)(packages|src|app|components|pages|lib|hooks|features|services|utils)\//i);
      if (sourceMarker) {
        const offset = sourceMarker.index + (sourceMarker[0].startsWith('/') ? 1 : 0);
        return url.pathname.slice(offset);
      }
    } catch {}
    return normalized;
  }
  const marker = normalized.match(/(?:^|\/)(packages|src|app|components|pages|lib|hooks|features|services|utils)\//i);
  if (marker) {
    const offset = marker.index + (marker[0].startsWith('/') ? 1 : 0);
    return normalized.slice(offset);
  }
  if (/^(?:[a-z]:\/|\/)/i.test(normalized)) {
    return normalized.split('/').filter(Boolean).at(-1) || normalized;
  }
  return normalized;
}

function _parseFrame(raw) {
  if (typeof raw === 'string' && !/:\d+:\d+\)?$/.test(raw.trim())) return null;
  const input = raw && typeof raw === 'object' ? raw : _firefoxToV8(raw);
  const parsed = parseRuntimeSourceLocation(input);
  if (!parsed?.file || parsed.file === 'Error' || parsed.file === 'native') return null;
  const file = _projectFacingFile(parsed.file);
  const generated = parsed.generated === true;
  const precision = !generated
    ? 'source-location'
    : file !== parsed.file && !/^(?:https?:|blob:|data:)/i.test(file)
      ? 'module-location'
      : 'generated-runtime';
  return Object.freeze({
    file,
    line: parsed.line,
    column: parsed.column,
    functionName: parsed.functionName,
    generated,
    precision,
  });
}

function _matchesSkip(raw, frame, patterns) {
  const haystack = `${String(raw || '')}\n${frame?.file || ''}`.toLowerCase();
  return patterns.some(pattern => {
    if (pattern instanceof RegExp) return pattern.test(haystack);
    return haystack.includes(String(pattern).toLowerCase());
  });
}

function applicationFramesFromStack(stack, { skipPatterns = [], maxFrames = 5 } = {}) {
  if (typeof stack !== 'string' || !stack.trim()) return Object.freeze([]);
  const patterns = [...DEFAULT_SKIP_PATTERNS, ...skipPatterns];
  const frames = [];
  for (const raw of stack.split('\n')) {
    const frame = _parseFrame(raw);
    if (!frame || _matchesSkip(raw, frame, patterns)) continue;
    frames.push(frame);
    if (frames.length >= Math.max(1, Math.min(10, maxFrames))) break;
  }
  return Object.freeze(frames);
}

function _source(frame) {
  if (!frame?.file) return null;
  return Object.freeze({
    file: frame.file,
    line: frame.line,
    column: frame.column,
    functionName: frame.functionName,
  });
}

function captureSourceProvenance({
  stack = null,
  source = null,
  kind = SourceProvenanceKind.RELATED,
  basis = null,
  skipPatterns = [],
  maxFrames = 5,
} = {}) {
  const explicit = source ? _parseFrame(source) : null;
  const stackFrames = applicationFramesFromStack(stack, { skipPatterns, maxFrames });
  const frames = [];
  const seen = new Set();
  for (const frame of [explicit, ...stackFrames]) {
    if (!frame?.file) continue;
    const key = `${frame.file}:${frame.line ?? ''}:${frame.column ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    frames.push(frame);
    if (frames.length >= Math.max(1, Math.min(10, maxFrames))) break;
  }
  const primary = explicit || frames[0] || null;
  if (!primary) return Object.freeze({ source: null, provenance: null });
  const resolvedBasis = basis || (explicit ? 'explicit-source' : 'runtime-stack');
  return Object.freeze({
    source: _source(primary),
    provenance: Object.freeze({
      kind,
      basis: resolvedBasis,
      precision: primary.precision || (primary.generated ? 'generated-runtime' : 'source-location'),
      frameCount: frames.length,
      frames: Object.freeze(frames),
    }),
  });
}

export { SourceProvenanceKind, applicationFramesFromStack, captureSourceProvenance };
