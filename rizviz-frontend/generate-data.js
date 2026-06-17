const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const excelPath = path.join(__dirname, '../Interview Software.xlsx');
if (!fs.existsSync(excelPath)) {
  console.error("Excel file not found at:", excelPath);
  process.exit(1);
}

const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames.find(name => 
  name.toLowerCase().includes('interview')
) || workbook.SheetNames[0];

const worksheet = workbook.Sheets[sheetName];

// We need to read the sheet row-by-row
// Convert to array of arrays first to make it easy to find headers
const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

// Find the header row
let headerIndex = -1;
let headers = [];

for (let i = 0; i < rawRows.length; i++) {
  const row = rawRows[i];
  const rowStr = row.join(' ').toLowerCase();
  if (rowStr.includes('interviewee') && (rowStr.includes('company') || rowStr.includes('job hunter'))) {
    headerIndex = i;
    // Clean headers: remove trailing colons, whitespace
    headers = row.map(h => (h || '').toString().trim().replace(/:$/, '').trim());
    break;
  }
}

if (headerIndex === -1) {
  console.error("Could not find interview header row in Excel sheet.");
  process.exit(1);
}

console.log("Found header at row", headerIndex, "with headers:", headers);

// Find header positions case-insensitively
const findIndex = (aliases) => {
  return headers.findIndex(h => {
    const cleanH = h.toLowerCase();
    return aliases.some(alias => cleanH.includes(alias));
  });
};

const srIdx = findIndex(['sr.', 'sr', 'serial']);
const invToIdx = findIndex(['inv. to', 'inv to', 'invto']);
const dateIdx = headers.findIndex(h => h.toLowerCase() === 'date');
const interviewerIdx = findIndex(['interview for', 'interviewer']);
const intervieweeIdx = findIndex(['interviewee name', 'interviewee']);
const jobHunterIdx = findIndex(['job hunter', 'jh']);
const companyIdx = findIndex(['company name', 'company']);
const typeIdx = findIndex(['interview type', 'type']);
const statusIdx = headers.findIndex(h => h.toLowerCase() === 'status');

console.log("Header Indexes:", { srIdx, invToIdx, dateIdx, interviewerIdx, intervieweeIdx, jobHunterIdx, companyIdx, typeIdx, statusIdx });

const allInterviews = [];
const interviewersSet = new Set();
const intervieweesSet = new Set();
const companiesSet = new Set();
const jobHuntersSet = new Set();
const statusesSet = new Set();

for (let i = headerIndex + 1; i < rawRows.length; i++) {
  const row = rawRows[i];
  if (!row || row.length === 0) continue;

  const interviewee = intervieweeIdx !== -1 ? (row[intervieweeIdx] || '').toString().trim() : '';
  if (!interviewee || interviewee.toLowerCase().includes('interviewee')) continue;

  const interviewer = interviewerIdx !== -1 ? (row[interviewerIdx] || '').toString().trim() : '';
  const company = companyIdx !== -1 ? (row[companyIdx] || '').toString().trim() : '';
  const jobHunter = jobHunterIdx !== -1 ? (row[jobHunterIdx] || '').toString().trim() : '';
  const status = statusIdx !== -1 ? (row[statusIdx] || '').toString().trim() : '';
  const srVal = srIdx !== -1 ? row[srIdx] : null;
  const invToVal = invToIdx !== -1 ? (row[invToIdx] || '').toString().trim() : '';
  const typeVal = typeIdx !== -1 ? (row[typeIdx] || 'Technical').toString().trim() : 'Technical';
  
  let dateVal = dateIdx !== -1 ? row[dateIdx] : '';
  if (typeof dateVal === 'number') {
    // Excel date serial number
    const date = new Date((dateVal - 25569) * 86400 * 1000);
    dateVal = date.toISOString().split('T')[0];
  } else {
    dateVal = (dateVal || '').toString().trim();
  }

  const interviewObj = {
    id: i, // Use row index as unique React/DOM key
    sr: parseInt(srVal, 10) || null,
    invTo: invToVal,
    date: dateVal,
    interviewer: interviewer,
    interviewee: interviewee,
    jobHunter: jobHunter,
    company: company,
    type: typeVal,
    status: status
  };

  allInterviews.push(interviewObj);

  if (interviewer) interviewersSet.add(interviewer);
  if (interviewee) intervieweesSet.add(interviewee);
  if (company) companiesSet.add(company);
  if (jobHunter) jobHuntersSet.add(jobHunter);
  if (status) statusesSet.add(status);
}

// Fallbacks from user's list
const userInterviewers = [
  "Mirza Muhammad Taqi / Fawad", "Rehan Ahmad (EXE) Co Azfer", "Syed Muhammad (Shabeeh)", "Anna Zaidi", "Furqan Saeed", 
  "Mujtaba Mehdi Devops", "Hassan Khan", "Nuzhat Sayed (EXE) Co Shabbir", "Feryal Nasim Ansari C/O Fawad", "Muhammad Shoaib / Fawad",
  "Ibrahim Jafri", "Syeda Fatima (EXE) Co Mohsin", "Syed Mohsin Raza", "Amna Hamdani", "Omair Bangash EXE", "SyedShah Hussain Jafri",
  "Syed A. Rizvi (EXE) Co Azfer", "Marreem Ali/Fawad", "Ramsha Idreess/Fawad", "Fatima Saeed", "Fatima Kabir",
  "Hussain Marriam / Fawad", "Syed Muhammad Raza Naqvi", "Fawad", "Ahmad Fayaz (EXE)", "Aun Zaidi", "Aziz Rizvi",
  "Khawar ALi EXE", "Sarmad Samana/Fawad", "Ali Hadi", "Humza Ahmed (EXE)", "Aroosa Dar", "Hina Zaidi", "Anam Khawar EXE",
  "Nicolas Javier", "Jaffer Zaidi(Hyder zaidi)", "Abbas Zaidi", "Farman Rizvi", "Shaham Hussain", "Khush Sultana", "Ali Bangash (EXE)",
  "Syed Hussainy(Fawad)", "Sara Abbas", "Muhammad Shahzad(Fawad)", "Tariq Farooq EXE", "Raza Rizvi", "Azeem Subhani", "Fatima Zahra TZ",
  "Muaz(Adeel)", "Kamran Zaidi", "Sukaina Shah (EXE) C/o Haider Shah", "Syeda Madiha Mukhtar C/O Shanzey", "Fatima Ahengary (EXE)",
  "Shabeeh", "Nadia Shah EXE", "Muhammad Ali (EXE)", "Zain Ahmed (EXE)", "Haroon Khan", "Khan Fahad Ahmed (fawad)",
  "Hamza Ali Bangash (EXE)", "Hamza Zaidi", "Abid Hussain EXE", "Fahad Altaf EXE", "Urooj Bakht EXE", "Mubeen Ashraf EXE",
  "Imran Khan EXE", "Syed Atif Rizvi", "Syed Haider", "Farwa Zaidi", "Rukh Zahra", "Zulfiqar", "Syed Hassan Raza (EXE) Co Mohsin",
  "Mehwish/Fawad", "Mustafa khan/ Fawad", "Shabbir Abbas", "Shaikh Mohammed Rohail / Fawad", "Syed Husayn Raza",
  "Syed Farhan Jafferi", "Haider Shah (AIML) (EXE)", "Haider Shah (EXE)", "Ammar Chaudhry", "Ammar Sabzwari (Maisam)",
  "Syed M. Meesam Rizvi EXE", "Umair Aqil (EXE) Co Azfer", "Syeda Amna Haider", "Zoha", "Sarfraz samana(Fawad)",
  "Rizwanuddin Qazi", "Isra gazal/Fawad", "Shahroz Awan EXE", "Shabbir Abbas Sayed EXE", "Al Azadi",
  "Syed Qasim (EXE) Co Mohsin", "Syed Hassan Raza EXE", "Mahreen Haider EXE", "Noor Jafri C/O Asfer", "Nasir Khan"
];

const userInterviewees = [
  "Shaheer Mehmood", "Arez Hassan", "Hashir Tariq", "Ammara Liaqat", "Walli Ullah", "Abdul Razzak", "Shahzar Nasir", 
  "Amna Jamil", "Zainab", "Sadaf Khurram", "Kashif Nawaz", "Ali Mehmood", "Ali Subhan", "Yahya", "Moez Ul Kareem", 
  "Fahad Imran", "Fawaz baig", "Tauseeq Zakir", "Muhammad Abdullah Virk", "Attia Mushtaq Virk", "Sohaib Saqib", 
  "Laiba Saeed", "Talha Qayyum", "Muhammad Adil Kamran", "Muhammad Imaz", "Muhammad Haris Waheed", "Muhammad Faizan Shahid", 
  "Bilal Ahmed", "Hassan Ali", "Muhammad Waqar Azeem", "Muhammad Younas", "Nouman Ejaz", "Muhammad Umar Khan", 
  "Zunaira Bhatti", "Nauman Mansoor (Snow)"
];

const userCompanies = [
  "Ramisuns", "M&T", "Tekysystem", "K-Tek/hcl", "UC davis", "SS&C tech", "DSS", "THRU", "insight", "Nextgen", "Fugerson", 
  "AVI", "CGI", "Agility", "Thales", "Manpower", "DUKE", "Hagerty", "Geisinger", "glidefast", "Insight", "Hexaware", 
  "WPS", "Premise", "Guide house", "Marathon", "GXO", "Corieo", "Huron", "Davita", "SN", "Grow financial", "TCS", 
  "New york life insurance", "HCL", "Rimnistreet", "Ateko", "9th way", "Tenger Ways", "Deloitte", "Appz logic", "Genpact", 
  "RIT", "Icono", "Northwestern", "Glidefast", "Discoll", "Hexaware", "Corvel", "DXC", "Front line", "Sentara", "Leidos", 
  "Maryland", "Scodac", "Plutus", "Cognizant", "Tier4", "Accenture", "Standard", "Texas roadhouse", "Golden1", "Sprezzature", 
  "Mana'o pilli", "Cloudwise", "Kforce", "Driscoll", "The uni of north", "SAP", "Roberthalf", "Harvard partners", 
  "Atlantic health", "Rangan", "Flexion", "Ricoh", "Recru", "Four dragon", "Compass", "Carilion", "Ulta beauty", "Solve IT", 
  "Northern trust", "Envision health", "Belcan", "Teach m/M", "Addison group", "DMI", "BJC", "Presidio", "Acuity", 
  "Peraton", "Mayo clinic", "Bean infosys", "Intremtel", "SENECA", "UW", "Northwell", "Ahold", "Columbia tech", 
  "Timber It", "Crowdstrike", "Agility IT", "Top tech", "Eteam", "Ripton solution", "Scicom", "Paylocity", "Zazmic", 
  "Telus", "RTX", "K2 partnering", "West monroe", "Peak solution", "NRG", "Imran Khan", "Gfiber", "Golden 1", 
  "Solving IT", "Persidio", "Source group", "TBA", "Quinn", "BCMC", "Dell", "thinkbrg", "Cross fuze", "Polaris tech", 
  "Boomi", "Bank of america", "Abbott", "JCW", "DNA", "Accion lab", "Nvidia", "Highwages", "Sonata", "State of north", 
  "Red global", "Summit7", "Cardinal health", "Advance solution", "Light house", "Systechcrop", "Alkami", "Century communities", 
  "Trident", "Trident care", "Medstar", "Unico", "Randstad", "Sprezzture", "Future tech", "Prpper tech", "Objectwin", 
  "Jobot", "Occams", "E commerce", "Ahead", "Akkdois", "Volt", "Akraya", "Tailored", "Technocore", "Tanium", "HCL tech", 
  "Inovalon", "Altiatek", "Mercury", "TRS", "Sumitomo", "Fujitsu", "Stridepath", "Providence", "Carnival cruise line", 
  "Bestica", "Tech us IT", "Beacon hill", "RGP", "Ganzeon", "Genezon", "Execu sys", "Gazelle", "Commerial finance", 
  "Globifye", "Summite 7", "HCSC", "Artech", "Nelson", "Techhuman", "Stand8", "Sogeti", "Joboot", "Quinn LLP", "Bisanz", 
  "89 Solution", "Banking domain", "Harris county", "BCBS", "BCBSKS", "Alldus", "GIT", "Matchboxhr", "Strate", 
  "Herb a Life", "Teksystem", "Recrue", "Advance", "Forever human"
];

const userJobHunters = [
  "Bazel Bilal", "Hamza Zakir", "Roshaan", "Atta Ullah", "Syed Muhammad Murtaza Hussain", "Muzhdah", "Neha", 
  "Zaryab Kashif", "Abdullah Anwar", "Abdul Haseeb", "Reham Asif", "Zahra Es Haq", "Asma Saleem", "Ahmed Khan", 
  "Ahsan Sohail", "Muhammad Moeed", "Syeda Rimsha", "Muhammad Haris Zubair", "Sikandar", "Ali Maisam", 
  "Zain Munir Sial", "Mohammad Usman", "Naveed TGS", "Zain TGS", "Arslan Babar", "Zakia", "Yareeha", 
  "Muhammad Awon", "Abbas", "Aun Hussain jaffri", "Ahmed Hussain", "Muhammad Sameer", "Muhammad Ahad Butt", 
  "Abubakkar Saddique", "Muhammad Moaaz Tariq", "Syed Musa Raza Sherazi", "Tehniaat Fatima", "Imran Munir Alvi", 
  "Nauman Mansoor", "Muhammad Sufiyan", "Sufyan Khalid", "Muhammad Salman Amir", "Ammad Ali Khan", "Ashir Ali", 
  "Muhammad Umair Bhatti", "Yasir Mushtaq", "Ahmed Nabeel", "Mohammad Umair", "Syeda Rimsha"
];

const userStatuses = [
  "converted", "cancelled", "rejected", "dropped", "rescheduled", "date changed", "closed", "dead"
];

// Combine Sets with fallbacks to avoid missing values
const finalInterviewers = Array.from(new Set([...interviewersSet, ...userInterviewers])).map(s => s.trim()).filter(Boolean).sort();
const finalInterviewees = Array.from(new Set([...intervieweesSet, ...userInterviewees])).map(s => s.trim()).filter(Boolean).sort();
const finalCompanies = Array.from(new Set([...companiesSet, ...userCompanies])).map(s => s.trim()).filter(Boolean).sort();
const finalJobHunters = Array.from(new Set([...jobHuntersSet, ...userJobHunters])).map(s => s.trim()).filter(Boolean).sort();
const finalStatuses = Array.from(new Set([...statusesSet, ...userStatuses])).map(s => s.trim()).filter(Boolean).sort();

const interviewersData = finalInterviewers.map((name, index) => ({
  value: name,
  label: name,
  key: `interviewer-${index}`
}));

const intervieweesData = finalInterviewees.map((name, index) => ({
  value: name,
  label: name,
  key: `interviewee-${index}`
}));

const companiesData = finalCompanies.map((name, index) => ({
  value: name,
  label: name,
  key: `company-${index}`
}));

const jobHuntersData = finalJobHunters.map((name, index) => ({
  value: name,
  label: name,
  key: `jobhunter-${index}`
}));

const statusesData = finalStatuses.map((name, index) => ({
  value: name,
  label: name,
  key: `status-${index}`
}));

// Output to src/data/interviewData.js
const outputDir = path.join(__dirname, 'src/data');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const fileContent = `// Auto-generated interview data from excel sheet and static unique values
export const interviewers = ${JSON.stringify(interviewersData, null, 2)};

export const interviewees = ${JSON.stringify(intervieweesData, null, 2)};

export const companies = ${JSON.stringify(companiesData, null, 2)};

export const jobHunters = ${JSON.stringify(jobHuntersData, null, 2)};

export const statuses = ${JSON.stringify(statusesData, null, 2)};

export const allInterviews = ${JSON.stringify(allInterviews, null, 2)};
`;

fs.writeFileSync(path.join(outputDir, 'interviewData.js'), fileContent);
console.log("Successfully created src/data/interviewData.js with " + allInterviews.length + " interviews.");
