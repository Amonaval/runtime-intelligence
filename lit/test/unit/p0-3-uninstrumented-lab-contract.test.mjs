import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const labRoot = path.join(repoRoot, 'examples', 'react-uninstrumented-lab');
const businessRoot = path.join(labRoot, 'src', 'app');
const diagnosticsPath = path.join(labRoot, 'src', 'diagnostics', 'RuntimeIntelligenceRoot.jsx');
const guidePath = path.join(repoRoot, 'docs', 'NEW-PROJECT-INTEGRATION-GUIDE.md');

function walk(directory) {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walk(absolute));
    else if (/\.(?:js|jsx|mjs|ts|tsx)$/.test(entry.name)) output.push(absolute);
  }
  return output;
}

test('P0.3 hostile React business code remains completely uninstrumented', () => {
  const businessFiles = walk(businessRoot);
  assert.ok(businessFiles.length >= 7, 'hostile lab should remain non-trivial');

  const forbidden = [
    'runtime-intelligence',
    'RuntimeIntelligenceProvider',
    'RuntimeIntelligenceProfiler',
    'withRuntimeIntelligence',
    'useRuntimeIntelligence',
    'useRuntimeTrackedState',
    'useRuntimeEffect',
    'useRuntimeResource',
    'sourceProvenance',
  ];

  for (const file of businessFiles) {
    const source = fs.readFileSync(file, 'utf8');
    const relative = path.relative(repoRoot, file).replaceAll('\\', '/');
    for (const token of forbidden) {
      assert.equal(source.includes(token), false, `${relative} unexpectedly contains ${token}`);
    }
    assert.equal(
      /import\s*\{[^}]*\bProfiler\b[^}]*\}\s*from\s*['\"]react['\"]/.test(source),
      false,
      `${relative} must not import React Profiler`,
    );
    assert.equal(
      /<\s*Profiler(?:\s|>)/.test(source),
      false,
      `${relative} must not render React Profiler`,
    );
  }
});

test('P0.3 hostile React integration stays root-only and source-free', () => {
  const diagnostics = fs.readFileSync(diagnosticsPath, 'utf8');
  assert.match(diagnostics, /from 'runtime-intelligence\/react'/);
  assert.match(diagnostics, /from 'runtime-intelligence\/panel'/);
  assert.match(diagnostics, /profileRoot=\{true\}/);
  assert.doesNotMatch(diagnostics, /\bsource\s*=/);
});

test('new-project guide covers React, Lit, Vue and the evidence-honesty ladder', () => {
  const guide = fs.readFileSync(guidePath, 'utf8');
  for (const required of [
    '# React',
    '# Lit',
    '# Vue 3',
    'Level 0 — Observe',
    'Level 1 — Attribute',
    'Level 2 — Explain',
    'source unavailable',
    'examples/react-uninstrumented-lab',
  ]) {
    assert.ok(guide.includes(required), `guide missing ${required}`);
  }
});
