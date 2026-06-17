const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, 'Interview Software.xlsx');
console.log('Reading:', filePath);

const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('interview')) || workbook.SheetNames[0];
console.log('Using sheet:', sheetName);

const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

// Find headers
let headerRowIndex = -1;
for (let i = 0; i < data.length; i++) {
  const line = data[i].join(' ').toLowerCase();
  if (line.includes('sr') && line.includes('interviewee')) {
    headerRowIndex = i;
    break;
  }
}

if (headerRowIndex === -1) {
  headerRowIndex = 0;
}

const headers = data[headerRowIndex];
console.log('Headers found:', headers);

// Find columns
const statusColIdx = headers.findIndex(h => h && h.toString().toLowerCase().includes('status'));
const companyColIdx = headers.findIndex(h => h && h.toString().toLowerCase().includes('company'));
const intervieweeColIdx = headers.findIndex(h => h && h.toString().toLowerCase().includes('interviewee'));

console.log(`Indices - Status: ${statusColIdx}, Company: ${companyColIdx}, Interviewee: ${intervieweeColIdx}`);

// Let's modify a row around the middle or the first data row
// Find a row that has data
let targetRowIndex = -1;
for (let i = headerRowIndex + 1; i < data.length; i++) {
  if (data[i] && data[i][intervieweeColIdx]) {
    targetRowIndex = i;
    break;
  }
}

if (targetRowIndex !== -1) {
  const oldStatus = data[targetRowIndex][statusColIdx];
  const oldCompany = data[targetRowIndex][companyColIdx];
  const interviewee = data[targetRowIndex][intervieweeColIdx];
  
  // Toggle status or company name
  const newStatus = oldStatus === 'Cancelled' ? 'Rescheduled' : 'Cancelled';
  data[targetRowIndex][statusColIdx] = newStatus;
  
  console.log(`Modifying Row ${targetRowIndex}: ${interviewee} at ${oldCompany} - status from ${oldStatus} -> ${newStatus}`);
  
  // Convert back to sheet
  const newWorksheet = xlsx.utils.aoa_to_sheet(data);
  workbook.Sheets[sheetName] = newWorksheet;
  xlsx.writeFile(workbook, filePath);
  console.log('Excel file updated successfully!');
} else {
  console.log('No valid data row found to modify!');
}
