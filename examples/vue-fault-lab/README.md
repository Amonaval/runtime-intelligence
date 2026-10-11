# Vue Fault Lab

Synthetic R7 validation surface for the Vue adapter. It is not a demo product and must not be copied into real consumers.

```bash
npm run lab:vue:install
npm run lab:vue
```

The lab intentionally exercises:

- expensive Vue updates measured only across `beforeUpdate` → `updated`;
- a controlled component error through Vue's application error handler;
- repeated update observations without invented update causes;
- explicit resource acquisition/release plus an intentional leak;
- interaction/network proximity against a local Vite endpoint;
- the same canonical Runtime Intelligence panel.

All scenarios are synthetic and isolated under `examples/vue-fault-lab`.
