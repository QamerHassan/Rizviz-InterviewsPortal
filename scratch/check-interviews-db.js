const https = require('https');

// Check which Sr numbers are in the Interviews DB table
const opts = {
    hostname: 'rizviz-interviewsportal-production.up.railway.app',
    path: '/api/interviews?page=1&limit=200',
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
            const items = data.data || data.items || data || [];
            const arr = Array.isArray(items) ? items : [];
            console.log(`Total interviews in DB: ${data.total || arr.length}`);
            console.log('\nSr numbers in DB:');
            arr.forEach(i => {
                console.log(`  Sr=${i.sr || i.Sr} | ${i.intervieweeName || i.IntervieweeName} | ${i.companyName || i.CompanyName} | Status=${i.status || i.Status} | InvTo=${i.invTo || i.InvTo}`);
            });

            // Check specifically for Sr 4707
            const match4707 = arr.find(i => (i.sr || i.Sr) === 4707);
            console.log('\nSr 4707 in DB:', match4707 ? JSON.stringify(match4707, null, 2) : 'NOT FOUND');
        } catch(e) {
            console.log('Parse error:', e.message);
            console.log(raw.substring(0, 500));
        }
    });
});
req.on('error', err => console.error(err));
req.end();
