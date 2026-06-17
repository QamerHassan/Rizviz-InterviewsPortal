const http = require('http');

const payload = JSON.stringify({
  FirstName: "John",
  LastName: "Doe",
  FatherName: "Richard Doe",
  DateOfBirth: "1995-08-15T00:00:00.000Z",
  Gender: "Male",
  CNIC: "35201-1234567-9",
  Status: "Active",
  Type: "Permanent",
  Grade: "A+",
  ItOrNonIt: "IT",
  JoiningDate: "2026-05-19T00:00:00.000Z",
  BasicSalary: 100000,
  TermsAndConditions: "Agreed",
  CompanyCode: "RII",
  BranchCode: "LHE",
  BankInformation: {
    BankName: "HBL",
    AccountNumber: "123456",
    IBAN: "PK123456",
    BranchCode: "0112"
  },
  Addresses: [],
  EmergencyContacts: [],
  BloodRelations: [],
  HealthRecords: [],
  EducationRecords: [],
  EmploymentHistories: [],
  DepartmentTeams: [],
  SalaryHistories: [],
  SalaryIncrements: [],
  LoansAdvances: []
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/employee',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': payload.length
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(payload);
req.end();
