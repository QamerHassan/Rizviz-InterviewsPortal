const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../Interview Software.xlsx');
console.log('Reading:', filePath);

const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('interview')) || workbook.SheetNames[0];
console.log('Using sheet:', sheetName);

const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

// Find headers
let headerRowIndex = -1;
for (let i = 0; i < data.length; i++) {
  const line = (data[i] || []).join(' ').toLowerCase();
  if (line.includes('sr') && line.includes('interviewee')) {
    headerRowIndex = i;
    break;
  }
}

if (headerRowIndex === -1) {
  headerRowIndex = 0;
}

const headers = data[headerRowIndex];
const srColIdx = headers.findIndex(h => h && h.toString().toLowerCase().trim() === 'sr.');

console.log('SR Column index:', srColIdx);

const matchedRow = data.find((row, idx) => {
    if (idx <= headerRowIndex) return false;
    return row && row[srColIdx] && row[srColIdx].toString().trim() === '4707';
});

if (matchedRow) {
    console.log("Matched Row in Excel:");
    headers.forEach((h, idx) => {
        console.log(`${h}: ${matchedRow[idx] !== undefined ? matchedRow[idx] : '[EMPTY]'}`);
    });
} else {
    console.log("Sr 4707 NOT found in Excel!");
}
