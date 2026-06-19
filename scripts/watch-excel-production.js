const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const targetUrl = process.argv[2] || 'https://rizviz-interviewsportal-production.up.railway.app/api/interviews/sync-upload';
const filePath = path.resolve(__dirname, '..', 'Interview Software.xlsx');
const POLL_INTERVAL_MS = 3000; // Check every 3 seconds

if (!fs.existsSync(filePath)) {
  console.error(`Error: Excel file not found at ${filePath}`);
  process.exit(1);
}

console.log(`\x1b[36mMonitoring file:\x1b[0m ${filePath}`);
console.log(`\x1b[36mUploading updates to:\x1b[0m ${targetUrl}`);
console.log(`\x1b[33mPolling every ${POLL_INTERVAL_MS / 1000}s — saves to Excel will auto-sync to production.\x1b[0m`);
console.log('Press Ctrl+C to stop watching.\n');

// Get the initial mtime so we don't upload on startup
let lastMtime = fs.statSync(filePath).mtimeMs;
console.log(`\x1b[90mBaseline file time: ${new Date(lastMtime).toLocaleTimeString()}\x1b[0m\n`);

let uploadInProgress = false;

setInterval(() => {
  try {
    // If file was deleted/locked just skip this tick
    if (!fs.existsSync(filePath)) return;

    const currentMtime = fs.statSync(filePath).mtimeMs;

    if (currentMtime !== lastMtime) {
      lastMtime = currentMtime;

      if (uploadInProgress) {
        console.log(`\x1b[33m[${new Date().toLocaleTimeString()}] Change detected but upload in progress — will catch next poll.\x1b[0m`);
        return;
      }

      console.log(`\x1b[32m[${new Date().toLocaleTimeString()}] File changed! Uploading to production...\x1b[0m`);
      uploadInProgress = true;

      // Small delay to make sure Excel has finished writing
      setTimeout(() => {
        uploadFile(filePath, targetUrl, () => {
          uploadInProgress = false;
        });
      }, 800);
    }
  } catch (err) {
    // Ignore stat errors (file locked by Excel during save)
  }
}, POLL_INTERVAL_MS);

function uploadFile(file, url, onDone) {
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
      },
      timeout: 60000
    };

    const client = urlObj.protocol === 'https:' ? https : http;

    const req = client.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data = JSON.parse(responseBody);
            const hasChanges = (data.insertedRows || 0) + (data.updatedRows || 0) > 0;

            if (hasChanges) {
              console.log(`\x1b[32m✅ Sync complete — ${data.insertedRows} inserted, ${data.updatedRows} updated, ${data.unchangedRows} unchanged.\x1b[0m`);
              if (data.changes && data.changes.length > 0) {
                console.log('\x1b[36mChanges:\x1b[0m');
                data.changes.forEach((c) => {
                  console.log(`  \x1b[33m[${c.changeType}]\x1b[0m ${c.intervieweeName} @ ${c.companyName}: ${c.summary}`);
                });
              }
              console.log('\x1b[32m🔔 SignalR notifications sent to connected users.\x1b[0m');
            } else {
              console.log(`\x1b[90m[${new Date().toLocaleTimeString()}] Sync done — no data changes (${data.unchangedRows} unchanged). File metadata changed.\x1b[0m`);
            }
          } catch (e) {
            console.log('Upload finished. Status:', res.statusCode);
            console.log('Response:', responseBody.slice(0, 300));
          }
        } else {
          console.error(`\x1b[31mUpload failed: HTTP ${res.statusCode}\x1b[0m`);
          console.error('Details:', responseBody.slice(0, 500));
        }
        console.log('');
        onDone();
      });
    });

    req.on('error', (err) => {
      console.error(`\x1b[31mNetwork error:\x1b[0m`, err.message);
      console.log('');
      onDone();
    });

    req.on('timeout', () => {
      req.destroy();
      console.error('\x1b[31mRequest timed out after 60s\x1b[0m');
      console.log('');
      onDone();
    });

    req.write(postData);
    req.end();
  } catch (err) {
    console.error(`\x1b[31mError reading file:\x1b[0m`, err.message);
    console.log('');
    onDone();
  }
}
