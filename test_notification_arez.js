/**
 * test_notification_arez.js
 * --------------------------
 * Finds ANY row where IntervieweeName or JobHunterName contains "Arez Hassan"
 * and toggles its status to force a SignalR notification specifically for that user.
 *
 * Usage: node test_notification_arez.js [optional-name]
 * Example: node test_notification_arez.js "Roshaan"
 */

const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const TARGET_NAME = (process.argv[2] || 'Arez Hassan').trim();
const filePath = path.join(__dirname, 'Interview Software.xlsx');

console.log(`\n📋 Target name to find: "${TARGET_NAME}"`);
console.log(`📂 Reading: ${filePath}\n`);

if (!fs.existsSync(filePath)) {
  console.error('❌ File not found:', filePath);
  process.exit(1);
}

// Read using buffer to avoid lock issues
let workbook;
try {
  const buf = fs.readFileSync(filePath);
  workbook = xlsx.read(buf, { type: 'buffer', cellDates: true });
} catch (err) {
  console.error('❌ Failed to read Excel file:', err.message);
  console.error('   Make sure the file is not open in Excel/LibreOffice.');
  process.exit(1);
}

const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('interview')) || workbook.SheetNames[0];
console.log('📊 Using sheet:', sheetName);

const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

// Find header row
let headerRowIndex = -1;
for (let i = 0; i < data.length; i++) {
  const line = data[i].join(' ').toLowerCase();
  if (line.includes('interviewee') && (line.includes('company') || line.includes('job hunter'))) {
    headerRowIndex = i;
    break;
  }
}

if (headerRowIndex === -1) { headerRowIndex = 0; }

const headers = data[headerRowIndex];
console.log('📑 Headers:', headers.filter(Boolean).join(' | '), '\n');

// Identify column indices
const intervieweeColIdx = headers.findIndex(h => h && h.toString().toLowerCase().includes('interviewee name'));
const jobHunterColIdx   = headers.findIndex(h => h && h.toString().toLowerCase().includes('job hunter'));
const statusColIdx      = headers.findIndex(h => h && h.toString().toLowerCase().includes('status'));
const companyColIdx     = headers.findIndex(h => h && h.toString().toLowerCase().includes('company'));
const srColIdx          = headers.findIndex(h => h && h.toString().toLowerCase() === 'sr.');

console.log(`🔍 Column indices: SR=${srColIdx}, Interviewee=${intervieweeColIdx}, JobHunter=${jobHunterColIdx}, Status=${statusColIdx}, Company=${companyColIdx}`);

// Find rows matching target name
const matchingRows = [];
for (let i = headerRowIndex + 1; i < data.length; i++) {
  const row = data[i];
  if (!row || !row.length) continue;

  const interviewee = (row[intervieweeColIdx] || '').toString().trim();
  const jobHunter   = (row[jobHunterColIdx] || '').toString().trim();

  if (
    interviewee.toLowerCase().includes(TARGET_NAME.toLowerCase()) ||
    jobHunter.toLowerCase().includes(TARGET_NAME.toLowerCase())
  ) {
    matchingRows.push({ rowIndex: i, interviewee, jobHunter, company: (row[companyColIdx] || '').toString().trim(), status: (row[statusColIdx] || '').toString().trim(), sr: row[srColIdx] });
  }
}

console.log(`\n✅ Found ${matchingRows.length} row(s) matching "${TARGET_NAME}":`);
matchingRows.forEach((r, idx) => {
  console.log(`  [${idx}] Row ${r.rowIndex+1}: SR=${r.sr} | Interviewee='${r.interviewee}' | JobHunter='${r.jobHunter}' | Company='${r.company}' | Status='${r.status}'`);
});

if (matchingRows.length === 0) {
  console.error(`\n❌ No rows found for "${TARGET_NAME}". Check the name spelling or try a different name.`);
  console.log('\n💡 First 5 interviewee names found in file:');
  for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 10, data.length); i++) {
    const row = data[i];
    if (row && row[intervieweeColIdx]) {
      const name = (row[intervieweeColIdx] || '').toString().trim();
      if (name) console.log(`   Row ${i+1}: '${name}' (hex: ${Buffer.from(name).toString('hex')})`);
    }
  }
  process.exit(1);
}

// Modify the first matching row
const target = matchingRows[0];
const oldStatus = data[target.rowIndex][statusColIdx];

// Toggle between two statuses
const statuses = ['Shortlisted', 'Rescheduled', 'Cancelled', 'Selected'];
const currentIdx = statuses.findIndex(s => (oldStatus || '').toString().toLowerCase().includes(s.toLowerCase()));
const newStatus = statuses[(currentIdx + 1) % statuses.length];

data[target.rowIndex][statusColIdx] = newStatus;

console.log(`\n🔄 Modifying row ${target.rowIndex + 1}:`);
console.log(`   Interviewee: '${target.interviewee}'`);
console.log(`   JobHunter:   '${target.jobHunter}'`);
console.log(`   Company:     '${target.company}'`);
console.log(`   Status:      '${oldStatus}' → '${newStatus}'`);

// Write back
try {
  const newWorksheet = xlsx.utils.aoa_to_sheet(data);
  workbook.Sheets[sheetName] = newWorksheet;
  xlsx.writeFile(workbook, filePath);
  console.log('\n✅ Excel file updated successfully!');
  console.log('⏳ The backend auto-syncs every 30 seconds. Watch the backend console for notification logs...\n');
} catch (writeErr) {
  console.error('\n❌ Failed to write Excel file:', writeErr.message);
  if (writeErr.code === 'EBUSY') {
    console.error('   The file is locked by another process. Close Excel/LibreOffice and try again.');
  }
  process.exit(1);
}
