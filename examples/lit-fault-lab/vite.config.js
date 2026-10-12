import { defineConfig } from 'vite';

function faultApi() {
  return {
    name: 'runtime-intelligence-lit-fault-api',
    configureServer(server) {
      server.middlewares.use('/api/slow', async (_req, res) => {
        await new Promise(resolve => setTimeout(resolve, 180));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: true, at: Date.now() }));
      });
      server.middlewares.use('/api/fail', (_req, res) => {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: 'intentional-lit-fault-lab-failure' }));
      });
    },
  };
}

export default defineConfig({
  plugins: [faultApi()],
  server: { port: 4175, strictPort: true },
});
