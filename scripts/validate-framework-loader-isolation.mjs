import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const failures = [];

const contracts = [
  {
    framework: 'react',
    exportKey: './loader/react',
    loaderFile: 'lit/src/loader/react.js',
    requiredImport: "import('../react/index.js')",
    forbidden: ["../vue/index.js", "../lit/index.js"],
  },
  {
    framework: 'lit',
    exportKey: './loader/lit',
    loaderFile: 'lit/src/loader/lit.js',
    requiredImport: "import('../lit/index.js')",
    forbidden: ["../react/index.js", "../vue/index.js"],
  },
  {
    framework: 'vue',
    exportKey: './loader/vue',
    loaderFile: 'lit/src/loader/vue.js',
    requiredImport: "import('../vue/index.js')",
    forbidden: ["../react/index.js", "../lit/index.js"],
  },
];

for (const contract of contracts) {
  const exported = pkg.exports?.[contract.exportKey];
  const target = typeof exported === 'string' ? exported : exported?.import;
  if (!target) {
    failures.push(`Missing ${contract.exportKey} package export.`);
    continue;
  }
  if (target.replace(/^\.\//, '') !== contract.loaderFile) {
    failures.push(`${contract.exportKey} must resolve to ${contract.loaderFile}, got ${target}.`);
  }

  const source = readFileSync(path.join(root, contract.loaderFile), 'utf8');
  if (!source.includes(contract.requiredImport)) {
    failures.push(`${contract.exportKey} must dynamically import only its ${contract.framework} framework module.`);
  }
  if (!source.includes("import('../panel/index.js')")) {
    failures.push(`${contract.exportKey} must preserve optional shared panel loading.`);
  }
  for (const forbidden of contract.forbidden) {
    if (source.includes(forbidden)) {
      failures.push(`${contract.exportKey} must not reference unrelated framework module ${forbidden}.`);
    }
  }
}

const litLab = readFileSync(path.join(root, 'examples/lit-fault-lab/src/runtime-intelligence.js'), 'utf8');
if (!litLab.includes("from 'runtime-intelligence/loader/lit'")) {
  failures.push('Lit Fault Lab must use runtime-intelligence/loader/lit, not the generic multi-framework loader.');
}
if (litLab.includes("from 'runtime-intelligence/loader'")) {
  failures.push('Lit Fault Lab regressed to the generic multi-framework loader.');
}

const vueLab = readFileSync(path.join(root, 'examples/vue-fault-lab/src/main.js'), 'utf8');
if (!vueLab.includes("from 'runtime-intelligence/loader/vue'")) {
  failures.push('Vue Fault Lab must use runtime-intelligence/loader/vue.');
}

if (failures.length) {
  console.error(`Framework loader isolation failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log('Framework loader isolation passed for React, Lit and Vue.');
console.log('Rule: framework-specific bundles must not traverse optional peer adapters for ecosystems they do not use.');
