const https = require('https');

const BASE_URL = 'rizviz-interviewsportal-production.up.railway.app';

function get(path) {
  return new Promise((resolve) => {
    const req = https.request({ method: 'GET', hostname: BASE_URL, path, port: 443 }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', (e) => resolve({ status: 0, body: e.message }));
    req.end();
  });
}

async function main() {
  console.log('Testing production endpoints...\n');

  // Test 1: sync-status (GET)
  const ss = await get('/api/interviews/sync-status');
  console.log(`GET /api/interviews/sync-status => HTTP ${ss.status}`);
  try { console.log(JSON.stringify(JSON.parse(ss.body), null, 2)); } catch { console.log(ss.body.slice(0,300)); }

  console.log('\n--- Done ---');
}

main();
