const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'rizviz-interviewsportal-production.up.railway.app';
const filePath = path.resolve(__dirname, '..', 'Interview Software.xlsx');

function testSyncUpload() {
  return new Promise((resolve) => {
    if (!fs.existsSync(filePath)) {
      return resolve({ status: 0, body: 'Excel file not found: ' + filePath });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const fileName = 'Interview Software.xlsx';
    const boundary = '----TestBoundary' + Date.now();

    const bodyParts = [
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`),
      fileBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ];
    const bodyBytes = Buffer.concat(bodyParts);

    const options = {
      method: 'POST',
      hostname: BASE_URL,
      port: 443,
      path: '/api/interviews/sync-upload',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBytes.length
      },
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', (e) => resolve({ status: 0, body: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: 'Request timed out' }); });

    req.write(bodyBytes);
    req.end();
  });
}

async function main() {
  console.log('Testing POST /api/interviews/sync-upload on production...');
  console.log(`File: ${filePath}\n`);

  const result = await testSyncUpload();
  console.log(`HTTP Status: ${result.status}`);
  try {
    const data = JSON.parse(result.body);
    console.log(JSON.stringify(data, null, 2));
  } catch {
    console.log('Raw response:', result.body.slice(0, 500));
  }
}

main();
