const https = require('https');

const opts = {
    hostname: 'rizviz-interviewsportal-production.up.railway.app',
    path: '/api/feedback',
    method: 'GET',
    headers: {
        'Authorization': 'Bearer db_jwt_mock_token_key_for_Rizviz'
    }
};

const req = https.request(opts, res => {
    let raw = '';
    res.on('data', d => raw += d);
    res.on('end', () => {
        try {
            const data = JSON.parse(raw);
            console.log(JSON.stringify(data, null, 2));
        } catch {
            console.log(raw);
        }
    });
});

req.on('error', err => {
    console.error(err);
});

req.end();
