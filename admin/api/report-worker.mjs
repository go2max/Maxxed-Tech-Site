import { buildSeedReport } from '../src/seed-report.mjs';

const json = (body, init = {}) => new Response(JSON.stringify(body, null, 2), {
  ...init,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...(init.headers || {})
  }
});

export async function handleReportRequest(request) {
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname.endsWith('/api/report/seed')) {
    return json(await buildSeedReport());
  }
  return json({ ok: false, error: 'Not found' }, { status: 404 });
}

export default {
  fetch: handleReportRequest
};
