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
  server: { port: 4179 },
});
