// Descriptor-aware property leases. An inactive owner can never be restored by
// a later teardown; changes made by the host while leased remain authoritative.
const targets = new WeakMap();
function same(a, b) {
  return !!a && !!b && ['value', 'get', 'set', 'writable', 'enumerable', 'configurable'].every(k => a[k] === b[k]);
}
export function ownBrowserProperty(target, key, value) {
  if (!target) return { update() {}, release() {} };
  let properties = targets.get(target);
  if (!properties) targets.set(target, properties = new Map());
  let state = properties.get(key);
  if (!state) {
    state = { original: Object.getOwnPropertyDescriptor(target, key), installed: null, owners: [] };
    properties.set(key, state);
  }
  const owner = { value };
  state.owners.push(owner);
  const write = next => {
    const current = Object.getOwnPropertyDescriptor(target, key);
    if (state.installed && !same(current, state.installed)) return;
    try {
      Object.defineProperty(target, key, { value: next, writable: true, enumerable: state.original?.enumerable ?? true, configurable: true });
      state.installed = Object.getOwnPropertyDescriptor(target, key);
    } catch {} // A non-configurable host property is never replaced.
  };
  write(value);
  let active = true;
  return {
    update(next) {
      if (!active) return;
      owner.value = next;
      if (state.owners.at(-1) === owner) write(next);
    },
    release() {
      if (!active) return;
      active = false;
      const top = state.owners.at(-1) === owner;
      state.owners.splice(state.owners.indexOf(owner), 1);
      if (top && same(Object.getOwnPropertyDescriptor(target, key), state.installed)) {
        if (state.owners.length) write(state.owners.at(-1).value);
        else {
          if (state.original) Object.defineProperty(target, key, state.original);
          else delete target[key];
        }
      }
      if (!state.owners.length) properties.delete(key);
    },
  };
}
