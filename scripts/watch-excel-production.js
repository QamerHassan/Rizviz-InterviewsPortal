const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const targetUrl = process.argv[2] || 'https://rizviz-interviewsportal-production.up.railway.app/api/interviews/sync-upload';
const filePath = path.resolve(__dirname, '..', 'Interview Software.xlsx');

if (!fs.existsSync(filePath)) {
  console.error(`Error: Excel file not found at ${filePath}`);
  process.exit(1);
}

console.log(`Monitoring file: ${filePath}`);
console.log(`Uploading updates to: ${targetUrl}`);
console.log('Press Ctrl+C to stop watching.\n');

let lastEventTime = 0;

fs.watch(filePath, (eventType) => {
  if (eventType === 'change') {
    const now = Date.now();
    if (now - lastEventTime > 2000) {
      lastEventTime = now;
      console.log(`[${new Date().toLocaleTimeString()}] Change detected! Preparing upload...`);

      // Small delay to allow Excel to release file handle lock
      setTimeout(() => {
        uploadFile(filePath, targetUrl);
      }, 500);
    }
  }
});

function uploadFile(file, url) {
  try {
    const fileBuffer = fs.readFileSync(file);
    const fileName = path.basename(file);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

    const postData = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`),
      fileBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const urlObj = new URL(url);
    const options = {
      method: 'POST',
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': postData.length
      }
    };

    const client = urlObj.protocol === 'https:' ? https : http;

    console.log('Uploading file...');
    const req = client.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data = JSON.parse(responseBody);
            console.log('\x1b[32mSync successful!\x1b[0m');
            console.log(`Message: ${data.message}`);
            console.log(`Inserted: ${data.insertedRows} | Updated: ${data.updatedRows} | Unchanged: ${data.unchangedRows}`);
            if (data.changes && data.changes.length > 0) {
              console.log('Changes dispatched:');
              data.changes.forEach((c) => {
                console.log(` - [${c.changeType}] ${c.intervieweeName} @ ${c.companyName}: ${c.summary}`);
              });
            }
          } catch (e) {
            console.log('\x1b[32mUpload finished with status:\x1b[0m', res.statusCode);
            console.log('Raw Response:', responseBody);
          }
        } else {
          console.error('\x1b[31mUpload failed:\x1b[0m', res.statusCode, res.statusMessage);
          console.error('Response details:', responseBody);
        }
        console.log('\nWaiting for next change...');
      });
    });

    req.on('error', (err) => {
      console.error('\x1b[31mUpload request error:\x1b[0m', err.message);
      console.log('\nWaiting for next change...');
    });

    req.write(postData);
    req.end();
  } catch (err) {
    console.error('\x1b[31mError reading file:\x1b[0m', err.message);
    console.log('\nWaiting for next change...');
  }
}
