import { bindings, defineConfig, exports } from 'cf/config';

// Deploy ONLY this Worker. The existing Pages portfolio configuration is unchanged.
export default defineConfig({
  accountId: 'cbf3e701028756b0568e7ea00033e38d',
  worker: {
    name: 'ai-apre-signal',
    entrypoint: './worker.js',
    compatibilityDate: '2026-11-05',
    workersDev: true,
    exports: {
      Room: exports.durableObject({ storage: 'sqlite' }),
      AuthGuard: exports.durableObject({ storage: 'sqlite' }),
    },
    env: {
      ROOMS: bindings.durableObject({ worker: 'ai-apre-signal', exportName: 'Room' }),
      AUTH_GUARD: bindings.durableObject({ worker: 'ai-apre-signal', exportName: 'AuthGuard' }),
      ALLOWED_ORIGINS: bindings.text('https://fabianoantero.site,https://portfolio-67x.pages.dev,http://localhost:8788,http://127.0.0.1:8788'),
      REQUIRE_TURN: bindings.text('true'),
      PUBLISH_PASSWORD: bindings.secret(),
      TURN_KEY_ID: bindings.secret(),
      TURN_API_TOKEN: bindings.secret(),
    },
    // Do not persist URLs containing single-use socket tickets in request logs.
    observability: {
      enabled: true,
      logs: { enabled: true, invocationLogs: false },
      traces: { enabled: true, headSamplingRate: 0.1 },
      redactQueryString: true,
    },
  },
});
