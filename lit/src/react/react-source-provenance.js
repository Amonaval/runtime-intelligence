import {
  captureSourceProvenance,
  SourceProvenanceKind,
} from '../core/source-provenance.js';

const REACT_SOURCE_SKIP_PATTERNS = Object.freeze([
  'RuntimeIntelligenceReact.js',
  'react-source-provenance.js',
  '/adapter/react/ReactAdapter.js',
  'runtime-intelligence.js',
  'runtime-intelligence_lit',
  '/runtime-intelligence/',
]);

function _sourceObject(source) {
  if (!source) return null;
  if (typeof source === 'string') {
    return Object.freeze({
      file: source,
      line: null,
      column: null,
      functionName: null,
    });
  }
  const file = source.file || source.url || null;
  if (!file) return null;
  return Object.freeze({
    file,
    line: Number.isFinite(source.line) ? source.line : null,
    column: Number.isFinite(source.column) ? source.column : null,
    functionName: source.functionName || source.function || null,
  });
}

function _comparableFile(file) {
  return String(file || '')
    .replace(/\\/g, '/')
    .replace(/[?#].*$/, '')
    .replace(/^webpack(?:-internal)?:\/+/, '')
    .replace(/^vite:\/+/, '')
    .replace(/^file:\/+/, '')
    .replace(/^\/@fs\//, '')
    .replace(/^\.\/+/, '')
    .toLowerCase();
}

function _sameFile(a, b) {
  const left = _comparableFile(a);
  const right = _comparableFile(b);
  if (!left || !right) return false;
  return left === right
    || left.endsWith(`/${right}`)
    || right.endsWith(`/${left}`);
}

function _frameFromSource(source, precision) {
  return Object.freeze({
    file: source.file,
    line: source.line,
    column: source.column,
    functionName: source.functionName,
    generated: false,
    precision,
  });
}

function _explicitResult(source, {
  kind,
  basis = 'explicit-source',
} = {}) {
  const normalized = _sourceObject(source);
  if (!normalized?.file) return Object.freeze({ source: null, provenance: null });
  const precision = Number.isFinite(normalized.line) ? 'source-location' : 'file-only';
  const frame = _frameFromSource(normalized, precision);
  return Object.freeze({
    source: normalized,
    provenance: Object.freeze({
      kind,
      basis,
      precision,
      frameCount: 1,
      frames: Object.freeze([frame]),
    }),
  });
}

function _replacePrimaryFrame(provenance, source, {
  kind,
  basis,
} = {}) {
  const precision = Number.isFinite(source?.line) ? 'source-location' : 'file-only';
  const nextPrimary = _frameFromSource(source, precision);
  const frames = Array.isArray(provenance?.frames) ? [...provenance.frames] : [];
  if (frames.length) frames[0] = nextPrimary;
  else frames.push(nextPrimary);
  return Object.freeze({
    kind,
    basis,
    precision,
    frameCount: frames.length,
    frames: Object.freeze(frames),
  });
}

function captureReactStack() {
  try {
    const error = new Error();
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(error, captureReactStack);
    }
    return error.stack || null;
  } catch {
    return null;
  }
}

function captureReactRegistrationSource({
  source = null,
  stack = null,
  functionName = null,
  kind = SourceProvenanceKind.COMPONENT_REGISTRATION,
  basis = 'react-registration-stack',
} = {}) {
  const explicit = _sourceObject(source);
  if (explicit?.file && Number.isFinite(explicit.line)) {
    return _explicitResult(explicit, { kind });
  }

  const captured = captureSourceProvenance({
    stack,
    kind,
    basis,
    skipPatterns: REACT_SOURCE_SKIP_PATTERNS,
    maxFrames: 5,
  });

  if (explicit?.file) {
    if (captured.source?.file && _sameFile(explicit.file, captured.source.file)) {
      const merged = Object.freeze({
        file: explicit.file,
        line: captured.source.line,
        column: captured.source.column,
        functionName: explicit.functionName
          || functionName
          || captured.source.functionName
          || null,
      });
      return Object.freeze({
        source: merged,
        provenance: _replacePrimaryFrame(captured.provenance, merged, { kind, basis }),
      });
    }
    return _explicitResult(Object.freeze({
      ...explicit,
      functionName: explicit.functionName || functionName || null,
    }), { kind });
  }

  if (!captured.source) return Object.freeze({ source: null, provenance: null });

  if (functionName && !captured.source.functionName) {
    const sourceWithName = Object.freeze({
      ...captured.source,
      functionName,
    });
    return Object.freeze({
      source: sourceWithName,
      provenance: _replacePrimaryFrame(captured.provenance, sourceWithName, { kind, basis }),
    });
  }

  return captured;
}

function captureReactInvocationSource({
  source = null,
  stack = null,
  kind = SourceProvenanceKind.INVOCATION,
  basis = 'react-invocation-stack',
} = {}) {
  const captured = captureSourceProvenance({
    stack,
    kind,
    basis,
    skipPatterns: REACT_SOURCE_SKIP_PATTERNS,
    maxFrames: 5,
  });
  if (captured.source) return captured;
  return _explicitResult(source, { kind });
}

function applicationStackFromReactProvenance(provenance) {
  const frames = Array.isArray(provenance?.frames) ? provenance.frames : [];
  if (!frames.length) return null;
  return frames.map(frame => {
    if (!frame?.file) return null;
    const line = Number.isFinite(frame.line) ? `:${frame.line}` : '';
    const column = Number.isFinite(frame.column) ? `:${frame.column}` : '';
    return `at ${frame.functionName || 'application'} (${frame.file}${line}${column})`;
  }).filter(Boolean).join('\n') || null;
}

export {
  REACT_SOURCE_SKIP_PATTERNS,
  captureReactStack,
  captureReactRegistrationSource,
  captureReactInvocationSource,
  applicationStackFromReactProvenance,
};
