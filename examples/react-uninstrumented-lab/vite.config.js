import { defineConfig } from 'vite';

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('content-length', Buffer.byteLength(body));
  res.end(body);
}

function uninstrumentedLabApi() {
  return {
    name: 'runtime-intelligence-uninstrumented-lab-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const parsed = new URL(req.url || '/', 'http://127.0.0.1');
        if (!parsed.pathname.startsWith('/api/uninstrumented/')) return next();

        if (parsed.pathname === '/api/uninstrumented/fail') {
          setTimeout(() => json(res, 503, {
            ok: false,
            code: 'DEPENDENCY_UNAVAILABLE',
            message: 'Synthetic downstream failure for hostile-app validation',
          }), 120);
          return;
        }

        if (parsed.pathname === '/api/uninstrumented/large-report') {
          const rows = Array.from({ length: 1600 }, (_, index) => ({
            id: index + 1,
            sku: `SKU-${String(index + 1).padStart(5, '0')}`,
            score: (index * 37) % 101,
            label: `Generated report row ${index + 1}`,
          }));
          setTimeout(() => json(res, 200, { ok: true, rows }), 120);
          return;
        }

        const requested = Number(parsed.searchParams.get('ms'));
        const ms = Number.isFinite(requested)
          ? Math.max(0, Math.min(requested, 4000))
          : 120;

        setTimeout(() => {
          json(res, 200, {
            ok: true,
            endpoint: parsed.pathname,
            delayedMs: ms,
            requestId: parsed.searchParams.get('requestId') || null,
          });
        }, ms);
      });
    },
  };
}

export default defineConfig({
  // The file: product dependency is linked outside this lab's node_modules.
  // Resolve its React peer from the consumer so hooks share one React instance.
  resolve: { dedupe: ['react', 'react-dom'] },
  plugins: [uninstrumentedLabApi()],
  server: { port: 4181 },
  preview: { port: 4181 },
});
