import { defineConfig } from 'vite';

function faultLabApi() {
  return {
    name: 'runtime-intelligence-vue-fault-lab-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const parsed = new URL(req.url || '/', 'http://127.0.0.1');
        if (parsed.pathname !== '/api/fault-lab/slow') return next();

        const requested = Number(parsed.searchParams.get('ms'));
        const ms = Number.isFinite(requested)
          ? Math.max(0, Math.min(requested, 2000))
          : 350;
        setTimeout(() => {
          const body = JSON.stringify({ ok: true, scenario: 'slow', delayedMs: ms });
          res.statusCode = 200;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.setHeader('content-length', Buffer.byteLength(body));
          res.end(body);
        }, ms);
      });
    },
  };
}

export default defineConfig({
  plugins: [faultLabApi()],
  resolve: {
    alias: {
      // The Fault Lab intentionally declares several components with inline
      // `template:` strings, so it needs Vue's compiler-enabled ESM build.
      vue: 'vue/dist/vue.esm-bundler.js',
    },
  },
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },
  server: { port: 4179 },
});
