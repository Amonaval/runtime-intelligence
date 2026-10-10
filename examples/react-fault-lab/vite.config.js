import { defineConfig } from 'vite';

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('content-length', Buffer.byteLength(body));
  res.end(body);
}

function faultLabApi() {
  return {
    name: 'runtime-intelligence-fault-lab-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const parsed = new URL(req.url || '/', 'http://127.0.0.1');
        if (!parsed.pathname.startsWith('/api/fault-lab/')) return next();

        if (parsed.pathname === '/api/fault-lab/error') {
          json(res, 503, { ok: false, scenario: 'network-error' });
          return;
        }

        if (parsed.pathname === '/api/fault-lab/large') {
          const body = JSON.stringify({
            ok: true,
            scenario: 'large-response',
            payload: 'x'.repeat(180 * 1024),
          });
          res.statusCode = 200;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.setHeader('content-length', Buffer.byteLength(body));
          res.end(body);
          return;
        }

        const requested = Number(parsed.searchParams.get('ms'));
        const ms = Number.isFinite(requested)
          ? Math.max(0, Math.min(requested, 5000))
          : parsed.pathname === '/api/fault-lab/slow'
            ? 2200
            : 90;

        setTimeout(() => {
          json(res, 200, {
            ok: true,
            scenario: parsed.pathname.split('/').pop(),
            delayedMs: ms,
          });
        }, ms);
      });
    },
  };
}

export default defineConfig({
  plugins: [faultLabApi()],
  server: { port: 4178 },
});
