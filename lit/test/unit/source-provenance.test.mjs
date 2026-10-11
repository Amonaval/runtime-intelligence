import test from 'node:test';
import assert from 'node:assert/strict';
import {applicationFramesFromStack,captureSourceProvenance,SourceProvenanceKind} from '../../src/core/source-provenance.js';

test('picks first app frame and bounds sanitized stack',()=>{
 const stack=`Error\n    at _patchedFetch (file:///repo/node_modules/runtime-intelligence/lit/src/core/network.js:80:15)\n    at apiClient (webpack-internal:///(app-pages-browser)/./lib/api-client.ts:44:11)\n    at loadMembers (webpack-internal:///(app-pages-browser)/./components/NetworkApp.tsx:187:7)\n    at reactCall (file:///repo/node_modules/react-dom/cjs/react-dom.development.js:1:1)`;
 const result=captureSourceProvenance({stack,kind:SourceProvenanceKind.INVOCATION});
 assert.equal(result.source.file,'lib/api-client.ts');
 assert.equal(result.source.line,44);
 assert.equal(result.source.column,11);
 assert.equal(result.provenance.kind,'invocation');
 assert.equal(result.provenance.precision,'module-location');
 assert.equal(result.provenance.frames.length,2);
 assert.equal(JSON.stringify(result).includes('node_modules'),false);
});

test('supports firefox frames',()=>{
 const frames=applicationFramesFromStack('Error\nloadMembers@http://localhost:3000/components/NetworkApp.tsx:187:7');
 assert.equal(frames[0].file,'components/NetworkApp.tsx');
 assert.equal(frames[0].functionName,'loadMembers');
});

test('returns no false location when stack only contains internals',()=>{
 const result=captureSourceProvenance({stack:'Error\n at x (/repo/node_modules/react-dom/index.js:1:1)\n at y (/repo/node_modules/runtime-intelligence/core/network.js:2:2)'});
 assert.equal(result.source,null); assert.equal(result.provenance,null);
});

test('normalizes Next webpack module prefixes in captured provenance',()=>{
 const result=captureSourceProvenance({stack:'Error\n at load (webpack-internal:///(app-pages-browser)/./components/NetworkApp.tsx:40:9)'});
 assert.equal(result.source.file,'components/NetworkApp.tsx');
});

test('strips local machine roots when a project source segment is present',()=>{
 const result=captureSourceProvenance({stack:'Error\n at load (C:/Users/alice/work/trustweave/components/NetworkApp.tsx:22:3)'});
 assert.equal(result.source.file,'components/NetworkApp.tsx');
 assert.equal(JSON.stringify(result).includes('Users/alice'),false);
});

test('does not expose local machine roots when no project segment is recognizable', () => {
  const result = captureSourceProvenance({
    stack: 'Error\n    at custom (C:\\Users\\alice\\PrivateWorkspace\\secret-module.ts:22:5)',
    kind: SourceProvenanceKind.INVOCATION,
  });
  assert.equal(result.source.file, 'secret-module.ts');
  assert.equal(JSON.stringify(result).includes('alice'), false);
  assert.equal(JSON.stringify(result).includes('PrivateWorkspace'), false);
});

test('does not disguise generated http chunks as project source paths', () => {
  const result = captureSourceProvenance({
    stack: 'Error\n    at run (http://localhost:3000/_next/static/chunks/app/page.js:812:14)',
    kind: SourceProvenanceKind.INVOCATION,
  });
  assert.equal(result.source.file, 'http://localhost:3000/_next/static/chunks/app/page.js');
  assert.equal(result.provenance.precision, 'generated-runtime');
});
