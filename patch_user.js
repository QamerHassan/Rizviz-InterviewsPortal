const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'RizvizERP.API', 'users.xlsx');
console.log('Reading:', filePath);

const workbook = xlsx.readFile(filePath);
const sheetName = 'users';
const worksheet = workbook.Sheets[sheetName];
if (!worksheet) {
  console.error('Sheet "users" not found!');
  process.exit(1);
}

const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
console.log('Header:', data[0]);

let found = false;
for (let i = 1; i < data.length; i++) {
  const row = data[i];
  if (row && row[2] && row[2].toString().trim().toLowerCase() === 'qamerhassan') {
    console.log('Found user QamerHassan at row', i + 1, ':', row);
    // Column 8 is index 7
    row[7] = 1; // Set IsFirstLogin to 1
    found = true;
    break;
  }
}

if (found) {
  const newWorksheet = xlsx.utils.aoa_to_sheet(data);
  workbook.Sheets[sheetName] = newWorksheet;
  xlsx.writeFile(workbook, filePath);
  console.log('users.xlsx updated successfully! QamerHassan IsFirstLogin set to 1.');
} else {
  console.log('User QamerHassan not found in users.xlsx!');
}
