using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using RizvizERP.API.DTOs;
using RizvizERP.API.Models;

namespace RizvizERP.API.Services
{
    public class MockServices : 
        IAuthService, 
        IEmployeeService, 
        IPayrollService, 
        IInventoryService, 
        IProjectService, 
        IRecruitmentService, 
        IDashboardService, 
        ISetupService
    {
        // Thread-safe static data storage representing the "database"
        private static readonly object _lock = new object();
        
        private static readonly List<User> _users = new List<User>();
        private static readonly List<AuditLog> _auditLogs = new List<AuditLog>();
        private static readonly List<Employee> _employees = new List<Employee>();
        private static readonly List<PayrollProcess> _payrollProcesses = new List<PayrollProcess>();
        private static readonly List<PayrollDetail> _payrollDetails = new List<PayrollDetail>();
        private static readonly List<Asset> _assets = new List<Asset>();
        private static readonly List<AssetAssignment> _assetAssignments = new List<AssetAssignment>();
        private static readonly List<Project> _projects = new List<Project>();
        private static readonly List<EmployeeProject> _employeeProjects = new List<EmployeeProject>();
        private static readonly List<JobPosting> _jobPostings = new List<JobPosting>();
        private static readonly List<Candidate> _candidates = new List<Candidate>();
        private static readonly List<Interview> _interviews = new List<Interview>();
        
        private static readonly List<Company> _companies = new List<Company>();
        private static readonly List<Branch> _branches = new List<Branch>();
        private static readonly List<DropdownValue> _dropdowns = new List<DropdownValue>();

        static MockServices()
        {
            InitializeSeedData();
        }

        private static void InitializeSeedData()
        {
            // Companies & Branches
            _companies.Add(new Company { Id = 1, CompanyCode = "RII", Name = "Rizviz Int. Impex", TaxId = "NTN-9876543-1", Address = "Main Boulevard, Lahore", Phone = "042-111-222-333", IsActive = true });
            
            _branches.Add(new Branch { Id = 1, BranchCode = "KHI", CompanyCode = "RII", Name = "Karachi Head Office", City = "Karachi", Address = "Clifton, Karachi", IsActive = true });
            _branches.Add(new Branch { Id = 2, BranchCode = "LHE", CompanyCode = "RII", Name = "Lahore Tech Branch", City = "Lahore", Address = "DHA Phase 5, Lahore", IsActive = true });
            _branches.Add(new Branch { Id = 3, BranchCode = "ISB", CompanyCode = "RII", Name = "Islamabad Executive Branch", City = "Islamabad", Address = "F-7, Islamabad", IsActive = true });

            // Users
            _users.Add(new User { Id = 1, Username = "Rizviz", PasswordHash = "5121472", FullName = "Rizviz Admin", Email = "admin@rizviz.com", RoleName = "Admin", CompanyCode = "RII", BranchCode = "LHE", IsActive = true });
            _users.Add(new User { Id = 2, Username = "admin", PasswordHash = "admin123", FullName = "Admin User", Email = "sysadmin@rizviz.com", RoleName = "Admin", CompanyCode = "RII", BranchCode = "LHE", IsActive = true });
            _users.Add(new User { Id = 3, Username = "hr", PasswordHash = "hr123", FullName = "HR Manager", Email = "hr@rizviz.com", RoleName = "HR", CompanyCode = "RII", BranchCode = "LHE", IsActive = true });
            _users.Add(new User { Id = 4, Username = "manager", PasswordHash = "mgr123", FullName = "Project Manager", Email = "manager@rizviz.com", RoleName = "Manager", CompanyCode = "RII", BranchCode = "LHE", IsActive = true });
            _users.Add(new User { Id = 5, Username = "employee", PasswordHash = "emp123", FullName = "John Doe", Email = "johndoe@rizviz.com", RoleName = "Employee", CompanyCode = "RII", BranchCode = "LHE", IsActive = true });

            // Dropdowns
            string[] grades = { "A+", "A", "B", "C", "D" };
            for (int i = 0; i < grades.Length; i++)
                _dropdowns.Add(new DropdownValue { Id = _dropdowns.Count + 1, Category = "Grade", Key = grades[i], Value = $"Grade {grades[i]}", DisplayOrder = i });

            string[] types = { "Permanent", "Contract", "Outsourced", "Intern" };
            for (int i = 0; i < types.Length; i++)
                _dropdowns.Add(new DropdownValue { Id = _dropdowns.Count + 1, Category = "EmployeeType", Key = types[i], Value = types[i], DisplayOrder = i });

            string[] statuses = { "Active", "Suspended", "Resigned", "Terminated" };
            for (int i = 0; i < statuses.Length; i++)
                _dropdowns.Add(new DropdownValue { Id = _dropdowns.Count + 1, Category = "Status", Key = statuses[i], Value = statuses[i], DisplayOrder = i });

            string[] religions = { "Islam", "Christianity", "Hinduism", "Sikhism", "Other" };
            for (int i = 0; i < religions.Length; i++)
                _dropdowns.Add(new DropdownValue { Id = _dropdowns.Count + 1, Category = "Religion", Key = religions[i], Value = religions[i], DisplayOrder = i });

            string[] currencies = { "PKR", "USD", "EUR", "GBP" };
            for (int i = 0; i < currencies.Length; i++)
                _dropdowns.Add(new DropdownValue { Id = _dropdowns.Count + 1, Category = "Currency", Key = currencies[i], Value = currencies[i], DisplayOrder = i });

            string[] paymentModes = { "Bank Transfer", "Cash", "Cheque" };
            for (int i = 0; i < paymentModes.Length; i++)
                _dropdowns.Add(new DropdownValue { Id = _dropdowns.Count + 1, Category = "PayMode", Key = paymentModes[i], Value = paymentModes[i], DisplayOrder = i });

            // Employees
            var emp1 = new Employee
            {
                Id = 1,
                EmpCode = "EMP-001",
                CompanyCode = "RII",
                BranchCode = "LHE",
                FirstName = "Qamer",
                MiddleName = "",
                LastName = "Hassan",
                FatherName = "Hassan Shah",
                Grade = "A+",
                Type = "Permanent",
                Status = "Active",
                CNIC = "35201-1234567-9",
                Gender = "Male",
                DateOfBirth = new DateTime(1990, 8, 15),
                JoiningDate = new DateTime(2020, 1, 1),
                JobOfferDate = new DateTime(2019, 12, 1),
                FinalInterviewDate = new DateTime(2019, 11, 20),
                MaritalStatus = "Married",
                NTN = "NTN-1122334",
                Nationality = "Pakistani",
                Religion = "Islam",
                IndividualOrCompany = "Individual",
                CNICValidity = new DateTime(2030, 8, 15),
                PassportNo = "AB1234567",
                PassportValidity = new DateTime(2028, 5, 20),
                LicenceNo = "LHE-9876",
                LicenceValidity = new DateTime(2029, 3, 10),
                ItOrNonIt = "IT",
                BasicSalary = 150000,
                OnJobSalary = 160000,
                Currency = "PKR",
                OnJobCurrency = "PKR",
                PayMode = "Bank Transfer",
                PaymentCurrency = "PKR",
                BankInformation = new BankInfo { Id = 1, EmployeeId = 1, BankName = "Meezan Bank", AccountNumber = "01020304050607", IBAN = "PK00MEZN01020304050607", BranchCode = "0112" },
                TermsAndConditions = "Agreed to standard terms and conditions of Rizviz Int. Impex."
            };
            emp1.Addresses.Add(new Address { Id = 1, EmployeeId = 1, Type = "Home", StreetAddress = "House 12, St 3, Sector Y", City = "Lahore", Country = "Pakistan", Phone = "0300-1234567" });
            emp1.EmergencyContacts.Add(new EmergencyContact { Id = 1, EmployeeId = 1, Name = "Sajid Hassan", Relation = "Brother", Phone = "0321-7654321" });
            emp1.BloodRelations.Add(new BloodRelation { Id = 1, EmployeeId = 1, Name = "Amna Hassan", Relation = "Spouse", CNIC = "35201-9999999-2", ContactNo = "0300-8888888" });
            emp1.HealthRecords.Add(new HealthData { Id = 1, EmployeeId = 1, BloodGroup = "O+", MedicalConditions = "None", Allergies = "Dust", EmergencyInstructions = "Contact family immediately." });
            emp1.EducationRecords.Add(new Education { Id = 1, EmployeeId = 1, Degree = "BS Computer Science", Institution = "FAST NUCES", PassingYear = 2012, GradeOrGpa = "3.2" });
            emp1.EmploymentHistories.Add(new EmploymentHistory { Id = 1, EmployeeId = 1, CompanyName = "Tech Solutions", Designation = "Software Engineer", FromDate = new DateTime(2012, 6, 1), ToDate = new DateTime(2019, 12, 15), LastSalary = 80000, ReasonForLeaving = "Better Career Opportunity" });
            emp1.DepartmentTeams.Add(new DepartmentTeam { Id = 1, EmployeeId = 1, Department = "Technology", Team = "Software Team A", Stack = ".NET Core & React", Module = "Core ERP", Type = "Primary" });
            emp1.SalaryHistories.Add(new SalaryHistory { Id = 1, EmployeeId = 1, EffectiveDate = new DateTime(2020, 1, 1), BasicSalary = 100000, OnJobSalary = 110000, Currency = "PKR", Reason = "Joining Salary" });
            emp1.SalaryHistories.Add(new SalaryHistory { Id = 2, EmployeeId = 1, EffectiveDate = new DateTime(2022, 1, 1), BasicSalary = 150000, OnJobSalary = 160000, Currency = "PKR", Reason = "Annual Increment" });
            emp1.LineManagerHistories.Add(new LineManagerHistory { Id = 1, EmployeeId = 1, LineManagerName = "Ahmad Ali", FromDate = new DateTime(2020, 1, 1), ToDate = null, IsPrimary = "Yes" });
            emp1.FunctionalRoleHistories.Add(new FunctionalRoleHistory { Id = 1, EmployeeId = 1, FunctionalRole = "Team Lead", FunctionalTitle = "Senior Software Engineer", LineManager = "Ahmad Ali", EffectiveDate = new DateTime(2022, 1, 1) });
            emp1.SalaryIncrements.Add(new SalaryIncrement { Id = 1, EmployeeId = 1, IncrementDate = new DateTime(2022, 1, 1), IncrementAmount = 50000, Percentage = "50%", ApprovedBy = "CEO" });
            
            var emp2 = new Employee
            {
                Id = 2,
                EmpCode = "EMP-002",
                CompanyCode = "RII",
                BranchCode = "LHE",
                FirstName = "Fatima",
                LastName = "Ali",
                FatherName = "Ali Raza",
                Grade = "A",
                Type = "Permanent",
                Status = "Active",
                CNIC = "35202-7654321-0",
                Gender = "Female",
                DateOfBirth = new DateTime(1994, 5, 22),
                JoiningDate = new DateTime(2021, 6, 1),
                MaritalStatus = "Single",
                Religion = "Islam",
                ItOrNonIt = "IT",
                BasicSalary = 90000,
                OnJobSalary = 95000,
                Currency = "PKR",
                PayMode = "Bank Transfer",
                PaymentCurrency = "PKR",
                BankInformation = new BankInfo { Id = 2, EmployeeId = 2, BankName = "HBL", AccountNumber = "1234567890123", IBAN = "PK00HABB1234567890123", BranchCode = "0225" }
            };
            emp2.Addresses.Add(new Address { Id = 2, EmployeeId = 2, Type = "Home", StreetAddress = "Apartment 4B, Gulberg", City = "Lahore", Country = "Pakistan", Phone = "0322-1234567" });
            emp2.EmergencyContacts.Add(new EmergencyContact { Id = 2, EmployeeId = 2, Name = "Ali Raza", Relation = "Father", Phone = "0301-7654321" });
            emp2.DepartmentTeams.Add(new DepartmentTeam { Id = 2, EmployeeId = 2, Department = "Technology", Team = "QA Team", Stack = "Selenium", Module = "Core ERP", Type = "Primary" });

            _employees.Add(emp1);
            _employees.Add(emp2);

            // Assets
            _assets.Add(new Asset { Id = 1, AssetCode = "AST-LPT-001", Name = "Dell Latitude 5420", Category = "Laptop", SerialNumber = "5XG12345", PurchaseDate = new DateTime(2022, 5, 10), Value = 180000, Status = "Assigned", Remarks = "Good condition" });
            _assets.Add(new Asset { Id = 2, AssetCode = "AST-LPT-002", Name = "MacBook Pro M2", Category = "Laptop", SerialNumber = "C02XXXXX", PurchaseDate = new DateTime(2023, 1, 15), Value = 350000, Status = "Available", Remarks = "Brand New" });
            _assets.Add(new Asset { Id = 3, AssetCode = "AST-SIM-001", Name = "Jazz Super Card SIM", Category = "SIM", SerialNumber = "899211XXXX", PurchaseDate = new DateTime(2021, 8, 1), Value = 1000, Status = "Assigned" });

            _assetAssignments.Add(new AssetAssignment { Id = 1, AssetId = 1, AssetCode = "AST-LPT-001", AssetName = "Dell Latitude 5420", EmployeeId = 1, EmployeeName = "Qamer Hassan", AssignedDate = new DateTime(2022, 5, 12), Status = "Active", Condition = "Excellent" });
            _assetAssignments.Add(new AssetAssignment { Id = 2, AssetId = 3, AssetCode = "AST-SIM-001", AssetName = "Jazz Super Card SIM", EmployeeId = 1, EmployeeName = "Qamer Hassan", AssignedDate = new DateTime(2021, 8, 2), Status = "Active", Condition = "New" });

            // Projects
            _projects.Add(new Project { Id = 1, ProjectCode = "PRJ-001", Name = "Enterprise ERP Migration", Description = "Migrate legacy PowerBuilder desktop ERP to React + ASP.NET Core web platform.", StartDate = new DateTime(2026, 2, 1), EndDate = new DateTime(2026, 12, 31), Status = "In Progress", ClientName = "Rizviz Int. Impex", Budget = 5000000 });
            _projects.Add(new Project { Id = 2, ProjectCode = "PRJ-002", Name = "Kids Bazaar Platform", Description = "Supermarket e-commerce site for children's items.", StartDate = new DateTime(2026, 4, 1), EndDate = new DateTime(2026, 9, 30), Status = "In Progress", ClientName = "Kids Bazaar Ltd.", Budget = 2500000 });

            _employeeProjects.Add(new EmployeeProject { Id = 1, EmployeeId = 1, ProjectName = "Enterprise ERP Migration", RoleInProject = "Lead Developer", AssignedDate = new DateTime(2026, 2, 1), AllocationPercentage = 80 });
            _employeeProjects.Add(new EmployeeProject { Id = 2, EmployeeId = 1, ProjectName = "Kids Bazaar Platform", RoleInProject = "Advisor", AssignedDate = new DateTime(2026, 4, 1), AllocationPercentage = 20 });
            _employeeProjects.Add(new EmployeeProject { Id = 3, EmployeeId = 2, ProjectName = "Enterprise ERP Migration", RoleInProject = "QA Engineer", AssignedDate = new DateTime(2026, 2, 15), AllocationPercentage = 100 });

            // Recruitment
            _jobPostings.Add(new JobPosting { Id = 1, Title = "Senior C# Developer", Department = "Technology", Description = "Looking for a C# .NET developer with 5+ years experience.", Requirements = ".NET Core, SQL Server, Web API, Git", OpeningsCount = 2, Status = "Active", PostedDate = new DateTime(2026, 5, 1) });
            _jobPostings.Add(new JobPosting { Id = 2, Title = "HR Officer", Department = "HR", Description = "Manage recruitment pipelines and employee documentation.", Requirements = "MBA HR, good communication skills", OpeningsCount = 1, Status = "Active", PostedDate = new DateTime(2026, 5, 10) });

            _candidates.Add(new Candidate { Id = 1, JobPostingId = 1, JobTitle = "Senior C# Developer", FullName = "Zahid Khan", Email = "zahid.khan@gmail.com", Phone = "0333-5551234", PipelineStatus = "Interview", AppliedDate = new DateTime(2026, 5, 5), ExperienceYears = "6 Years", CurrentSalary = "120,000", ExpectedSalary = "160,000" });
            _candidates.Add(new Candidate { Id = 2, JobPostingId = 1, JobTitle = "Senior C# Developer", FullName = "Ayesha Malik", Email = "ayesha.m@yahoo.com", Phone = "0321-9998887", PipelineStatus = "Hired", AppliedDate = new DateTime(2026, 5, 3), ExperienceYears = "7 Years", CurrentSalary = "150,000", ExpectedSalary = "190,000" });
            _candidates.Add(new Candidate { Id = 3, JobPostingId = 2, FullName = "Usman Ghani", Email = "usman.ghani@outlook.com", Phone = "0312-3456789", PipelineStatus = "Applied", AppliedDate = new DateTime(2026, 5, 12), ExperienceYears = "2 Years", CurrentSalary = "60,000", ExpectedSalary = "80,000" });

            // _interviews.Add(new Interview { Id = 1, CandidateId = 1, CandidateName = "Zahid Khan", JobTitle = "Senior C# Developer", ScheduleTime = DateTime.Today.AddDays(2).AddHours(14), InterviewerName = "Ahmad Ali", Round = "Technical Round", Status = "Scheduled", Feedback = "" });
        }

        private static int? _currentUserId = null;
        private static string _currentUserRole = null;

        public LoginResponse Login(LoginRequest request)
        {
            lock (_lock)
            {
                var user = AuthHelper.AuthenticateUser(request.Username, request.Password);
                if (user == null) return null;

                // Set static context for later filtering
                _currentUserId = user.Id;
                _currentUserRole = user.RoleName;

                return new LoginResponse
                {
                    Token = "db_jwt_mock_token_key_for_" + user.Username,
                    RefreshToken = $"mock-refresh-token-{Guid.NewGuid()}",
                    UserId = user.Id,
                    Username = user.Username,
                    FullName = user.FullName,
                    Role = user.RoleName,
                    InterviewName = user.InterviewName,
                    CompanyCode = user.CompanyCode ?? "RII",
                    BranchCode = user.BranchCode ?? "LHE",
                    IsFirstLogin = user.IsFirstLogin,
                    Expiry = DateTime.UtcNow.AddDays(7)
                };
            }
        }

        public LoginResponse RefreshToken(TokenRefreshRequest request)
        {
            return new LoginResponse
            {
                Token = $"mock-jwt-token-refreshed-{Guid.NewGuid()}",
                RefreshToken = $"mock-refresh-token-refreshed-{Guid.NewGuid()}",
                UserId = 1,
                Username = "Rizviz",
                FullName = "Rizviz Admin",
                Role = "Admin",
                CompanyCode = "RII",
                BranchCode = "LHE",
                Expiry = DateTime.UtcNow.AddDays(7)
            };
        }

        public void LogAction(string username, string action, string module, string ipAddress)
        {
            lock (_lock)
            {
                _auditLogs.Add(new AuditLog
                {
                    Id = _auditLogs.Count + 1,
                    Username = username,
                    Action = action,
                    Module = module,
                    Timestamp = DateTime.UtcNow,
                    IpAddress = ipAddress
                });
            }
        }

        public List<AuditLog> GetAuditLogs()
        {
            lock (_lock)
            {
                return _auditLogs.OrderByDescending(a => a.Timestamp).ToList();
            }
        }

        // ================= IEmployeeService =================
        public EmployeeStatsDto GetEmployeeStats()
        {
            lock (_lock)
            {
                return new EmployeeStatsDto
                {
                    Total = _employees.Count,
                    Active = _employees.Count(e => e.Status == "Active"),
                    SuspendedLeave = _employees.Count(e => e.Status == "Suspended"),
                    Terminated = _employees.Count(e => e.Status == "Terminated" || e.Status == "Resigned")
                };
            }
        }

        public List<EmployeeSummaryDto> GetAll(string search = null, string branchCode = null, string status = null, string statusGroup = null)
        {
            lock (_lock)
            {
                IEnumerable<Employee> query = _employees;

                if (!string.IsNullOrEmpty(branchCode))
                    query = query.Where(e => e.BranchCode == branchCode);

                if (!string.IsNullOrEmpty(status))
                    query = query.Where(e => e.Status == status);

                if (!string.IsNullOrEmpty(statusGroup) && statusGroup != "all")
                    query = query.Where(e => string.Equals(e.Status, statusGroup, StringComparison.OrdinalIgnoreCase));

                if (!string.IsNullOrEmpty(search))
                {
                    string lSearch = search.ToLower();
                    query = query.Where(e => e.FirstName.ToLower().Contains(lSearch) || 
                                             (e.LastName != null && e.LastName.ToLower().Contains(lSearch)) || 
                                             e.EmpCode.ToLower().Contains(lSearch) || 
                                             (e.CNIC != null && e.CNIC.Contains(search)));
                }

                return query.Select(e => new EmployeeSummaryDto
                {
                    Id = e.Id,
                    EmpCode = e.EmpCode,
                    FullName = e.FullName,
                    Grade = e.Grade,
                    Type = e.Type,
                    Status = e.Status,
                    CNIC = e.CNIC,
                    Gender = e.Gender,
                    ItOrNonIt = e.ItOrNonIt,
                    JoiningDate = e.JoiningDate,
                    BasicSalary = e.BasicSalary,
                    Department = e.DepartmentTeams.FirstOrDefault(d => d.Type == "Primary")?.Department ?? "Unassigned",
                    Designation = e.FunctionalRoleHistories.LastOrDefault()?.FunctionalTitle ?? "Software Engineer"
                }).ToList();
            }
        }

        public EmployeeDetailDto GetById(int id)
        {
            lock (_lock)
            {
                var emp = _employees.FirstOrDefault(e => e.Id == id);
                if (emp == null) return null;

                return MapToDetailDto(emp);
            }
        }

        public EmployeeDetailDto Create(EmployeeDetailDto dto)
        {
            lock (_lock)
            {
                var emp = new Employee();
                UpdateEmployeeFromDto(emp, dto);
                emp.Id = _employees.Count > 0 ? _employees.Max(e => e.Id) + 1 : 1;
                emp.EmpCode = $"EMP-{emp.Id:D3}";
                _employees.Add(emp);
                
                return MapToDetailDto(emp);
            }
        }

        public EmployeeDetailDto Update(int id, EmployeeDetailDto dto)
        {
            lock (_lock)
            {
                var emp = _employees.FirstOrDefault(e => e.Id == id);
                if (emp == null) return null;

                UpdateEmployeeFromDto(emp, dto);
                return MapToDetailDto(emp);
            }
        }

        public bool Delete(int id)
        {
            lock (_lock)
            {
                var emp = _employees.FirstOrDefault(e => e.Id == id);
                if (emp == null) return false;
                _employees.Remove(emp);
                return true;
            }
        }

        public List<SalaryHistory> GetSalaryHistory(int employeeId)
        {
            lock (_lock)
            {
                var emp = _employees.FirstOrDefault(e => e.Id == employeeId);
                return emp != null ? emp.SalaryHistories : new List<SalaryHistory>();
            }
        }

        public List<Document> GetDocuments(int employeeId)
        {
            lock (_lock)
            {
                var emp = _employees.FirstOrDefault(e => e.Id == employeeId);
                return emp != null ? emp.Documents : new List<Document>();
            }
        }

        public Document SaveDocument(int employeeId, string docType, string fileName, string filePath)
        {
            lock (_lock)
            {
                var emp = _employees.FirstOrDefault(e => e.Id == employeeId);
                if (emp == null) return null;

                var doc = new Document
                {
                    Id = emp.Documents.Count > 0 ? emp.Documents.Max(d => d.Id) + 1 : 1,
                    EmployeeId = employeeId,
                    DocumentType = docType,
                    DocumentName = fileName,
                    FilePath = filePath,
                    UploadedAt = DateTime.UtcNow
                };
                emp.Documents.Add(doc);
                return doc;
            }
        }

        // ================= IPayrollService =================
        public List<PayrollDetail> GetMonthlyPayroll(int year, int month)
        {
            lock (_lock)
            {
                var process = _payrollProcesses.FirstOrDefault(p => p.Year == year && p.Month == month);
                if (process == null) return new List<PayrollDetail>();

                return _payrollDetails.Where(d => d.PayrollProcessId == process.Id).ToList();
            }
        }

        public List<PayrollDetail> ProcessPayroll(PayrollProcessRequest request)
        {
            lock (_lock)
            {
                // Remove existing run for this month if exists
                var existing = _payrollProcesses.FirstOrDefault(p => p.Year == request.Year && p.Month == request.Month);
                if (existing != null)
                {
                    _payrollDetails.RemoveAll(d => d.PayrollProcessId == existing.Id);
                    _payrollProcesses.Remove(existing);
                }

                var process = new PayrollProcess
                {
                    Id = _payrollProcesses.Count > 0 ? _payrollProcesses.Max(p => p.Id) + 1 : 1,
                    Year = request.Year,
                    Month = request.Month,
                    ProcessedDate = DateTime.Now,
                    ProcessedBy = request.ProcessedBy,
                    IsConfirmed = true
                };

                decimal totalBasic = 0, totalAllowances = 0, totalDeductions = 0;

                foreach (var emp in _employees.Where(e => e.Status == "Active"))
                {
                    decimal taxRate = 0.10m; // Mock 10% tax
                    if (emp.BasicSalary > 150000) taxRate = 0.15m;
                    else if (emp.BasicSalary < 50000) taxRate = 0.05m;

                    decimal basic = emp.BasicSalary;
                    
                    // Allowances sum from other income
                    decimal allowances = emp.OtherIncomes.Sum(o => o.Amount);
                    
                    // Loan repayment deduction
                    decimal loanDeduction = 0;
                    var activeLoan = emp.LoansAdvances.FirstOrDefault(l => l.Status == "Active");
                    if (activeLoan != null)
                    {
                        loanDeduction = activeLoan.MonthlyDeduction;
                        activeLoan.RepaidAmount += loanDeduction;
                        if (activeLoan.RepaidAmount >= activeLoan.Amount)
                        {
                            activeLoan.Status = "Paid";
                        }
                    }

                    decimal tax = basic * taxRate;
                    decimal totalDed = tax + loanDeduction;
                    decimal net = basic + allowances - totalDed;

                    var detail = new PayrollDetail
                    {
                        Id = _payrollDetails.Count > 0 ? _payrollDetails.Max(d => d.Id) + 1 : 1,
                        PayrollProcessId = process.Id,
                        EmployeeId = emp.Id,
                        EmpCode = emp.EmpCode,
                        EmployeeName = emp.FullName,
                        Department = emp.DepartmentTeams.FirstOrDefault(d => d.Type == "Primary")?.Department ?? "General",
                        Designation = emp.FunctionalRoleHistories.LastOrDefault()?.FunctionalTitle ?? "Software Engineer",
                        BasicSalary = basic,
                        Allowances = allowances,
                        Deductions = totalDed,
                        TaxAmount = tax,
                        LoanDeduction = loanDeduction,
                        NetSalary = net,
                        PayMode = emp.PayMode ?? "Cash",
                        BankName = emp.BankInformation?.BankName,
                        AccountNumber = emp.BankInformation?.AccountNumber,
                        IsPaid = true,
                        PaidDate = DateTime.Now
                    };

                    _payrollDetails.Add(detail);

                    totalBasic += basic;
                    totalAllowances += allowances;
                    totalDeductions += totalDed;
                }

                process.TotalBasicSalary = totalBasic;
                process.TotalAllowances = totalAllowances;
                process.TotalDeductions = totalDeductions;
                process.TotalNetSalary = totalBasic + totalAllowances - totalDeductions;

                _payrollProcesses.Add(process);

                return _payrollDetails.Where(d => d.PayrollProcessId == process.Id).ToList();
            }
        }

        public PayslipDto GetPayslip(int employeeId, int month, int year)
        {
            lock (_lock)
            {
                var emp = _employees.FirstOrDefault(e => e.Id == employeeId);
                if (emp == null) return null;

                var process = _payrollProcesses.FirstOrDefault(p => p.Year == year && p.Month == month);
                var detail = process != null ? _payrollDetails.FirstOrDefault(d => d.PayrollProcessId == process.Id && d.EmployeeId == employeeId) : null;

                return new PayslipDto
                {
                    EmployeeId = employeeId,
                    EmpCode = emp.EmpCode,
                    EmployeeName = emp.FullName,
                    Department = emp.DepartmentTeams.FirstOrDefault(d => d.Type == "Primary")?.Department ?? "General",
                    Designation = emp.FunctionalRoleHistories.LastOrDefault()?.FunctionalTitle ?? "Software Engineer",
                    Month = month,
                    Year = year,
                    BasicSalary = detail?.BasicSalary ?? emp.BasicSalary,
                    Allowances = detail?.Allowances ?? emp.OtherIncomes.Sum(o => o.Amount),
                    Deductions = detail?.Deductions ?? (emp.BasicSalary * 0.10m),
                    TaxAmount = detail?.TaxAmount ?? (emp.BasicSalary * 0.10m),
                    LoanDeduction = detail?.LoanDeduction ?? 0,
                    NetSalary = detail?.NetSalary ?? (emp.BasicSalary + emp.OtherIncomes.Sum(o => o.Amount) - (emp.BasicSalary * 0.10m)),
                    PayMode = detail?.PayMode ?? emp.PayMode ?? "Cash",
                    BankName = detail?.BankName ?? emp.BankInformation?.BankName,
                    AccountNumber = detail?.AccountNumber ?? emp.BankInformation?.AccountNumber,
                    IBAN = emp.BankInformation?.IBAN
                };
            }
        }

        // ================= IInventoryService =================
        public List<AssetDto> GetAllAssets(string category = null, string status = null)
        {
            lock (_lock)
            {
                IEnumerable<Asset> query = _assets;
                if (!string.IsNullOrEmpty(category))
                    query = query.Where(a => a.Category == category);
                if (!string.IsNullOrEmpty(status))
                    query = query.Where(a => a.Status == status);

                return query.Select(a => {
                    var assignment = _assetAssignments.FirstOrDefault(asg => asg.AssetId == a.Id && asg.Status == "Active");
                    return new AssetDto
                    {
                        Id = a.Id,
                        AssetCode = a.AssetCode,
                        Name = a.Name,
                        Category = a.Category,
                        SerialNumber = a.SerialNumber,
                        PurchaseDate = a.PurchaseDate,
                        Value = a.Value,
                        Status = a.Status,
                        Remarks = a.Remarks,
                        AssignedToEmployeeName = assignment != null ? assignment.EmployeeName : null
                    };
                }).ToList();
            }
        }

        public Asset CreateAsset(Asset asset)
        {
            lock (_lock)
            {
                asset.Id = _assets.Count > 0 ? _assets.Max(a => a.Id) + 1 : 1;
                asset.AssetCode = $"AST-{asset.Category.Substring(0, 3).ToUpper()}-{asset.Id:D3}";
                asset.Status = "Available";
                _assets.Add(asset);
                return asset;
            }
        }

        public AssetAssignment AssignAsset(AssetAssignmentRequest request)
        {
            lock (_lock)
            {
                var asset = _assets.FirstOrDefault(a => a.Id == request.AssetId);
                var emp = _employees.FirstOrDefault(e => e.Id == request.EmployeeId);
                if (asset == null || emp == null) return null;

                // Deactivate any current assignment
                var currentAssignment = _assetAssignments.FirstOrDefault(asg => asg.AssetId == asset.Id && asg.Status == "Active");
                if (currentAssignment != null)
                {
                    currentAssignment.Status = "Returned";
                    currentAssignment.ReturnedDate = DateTime.Now;
                }

                asset.Status = "Assigned";

                var newAsg = new AssetAssignment
                {
                    Id = _assetAssignments.Count > 0 ? _assetAssignments.Max(a => a.Id) + 1 : 1,
                    AssetId = asset.Id,
                    AssetCode = asset.AssetCode,
                    AssetName = asset.Name,
                    EmployeeId = emp.Id,
                    EmployeeName = emp.FullName,
                    AssignedDate = request.AssignedDate,
                    Condition = request.Condition,
                    Status = "Active"
                };

                _assetAssignments.Add(newAsg);
                return newAsg;
            }
        }

        public bool ReturnAsset(int assetId, string condition)
        {
            lock (_lock)
            {
                // Find the active assignment by asset ID (frontend only knows asset ID)
                var asg = _assetAssignments.FirstOrDefault(a => a.AssetId == assetId && a.Status == "Active");
                if (asg == null) return false;

                asg.Status = "Returned";
                asg.ReturnedDate = DateTime.Now;
                asg.Condition = condition;

                var asset = _assets.FirstOrDefault(a => a.Id == assetId);
                if (asset != null)
                {
                    asset.Status = "Available";
                }

                return true;
            }
        }

        // ================= IProjectService =================
        public ProjectStatsDto GetProjectStats()
        {
            lock (_lock)
            {
                var list = _projects.Select(p => new ProjectDto
                {
                    Id = p.Id,
                    ProjectCode = p.ProjectCode,
                    Name = p.Name,
                    Status = p.Status,
                    Members = _employeeProjects.Where(ep => ep.ProjectName == p.Name).Select(ep => new ProjectMemberDto()).ToList()
                }).ToList();
                return new ProjectStatsDto
                {
                    Total = list.Count,
                    Active = list.Count(p => p.Status == "In Progress"),
                    ResourceAllocations = list.Sum(p => p.Members.Count),
                    WithTeamMembers = list.Count(p => p.Members.Count > 0)
                };
            }
        }

        public List<ProjectDto> GetAllProjects(string metric = null, string search = null)
        {
            lock (_lock)
            {
                var result = _projects.Select(p => new ProjectDto
                {
                    Id = p.Id,
                    ProjectCode = p.ProjectCode,
                    Name = p.Name,
                    Description = p.Description,
                    StartDate = p.StartDate,
                    EndDate = p.EndDate,
                    Status = p.Status,
                    ClientName = p.ClientName,
                    Budget = p.Budget,
                    Members = _employeeProjects.Where(ep => ep.ProjectName == p.Name).Select(ep => {
                        var empName = _employees.FirstOrDefault(e => e.Id == ep.EmployeeId)?.FullName ?? "Unknown";
                        return new ProjectMemberDto
                        {
                            EmployeeId = ep.EmployeeId,
                            EmployeeName = empName,
                            RoleInProject = ep.RoleInProject,
                            AllocationPercentage = ep.AllocationPercentage
                        };
                    }).ToList()
                }).ToList();

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var term = search.Trim().ToLowerInvariant();
                    result = result.Where(p =>
                        (p.Name != null && p.Name.ToLowerInvariant().Contains(term)) ||
                        (p.ProjectCode != null && p.ProjectCode.ToLowerInvariant().Contains(term))).ToList();
                }

                if (!string.IsNullOrEmpty(metric) && metric != "all")
                {
                    if (metric == "active")
                        result = result.Where(p => p.Status == "In Progress").ToList();
                    else if (metric == "allocations" || metric == "with_team")
                        result = result.Where(p => p.Members.Count > 0).ToList();
                }

                return result;
            }
        }

        public ProjectDto CreateProject(Project project)
        {
            lock (_lock)
            {
                project.Id = _projects.Count > 0 ? _projects.Max(p => p.Id) + 1 : 1;
                project.ProjectCode = $"PRJ-{project.Id:D3}";
                project.Status = "Planned";
                _projects.Add(project);

                return new ProjectDto
                {
                    Id = project.Id,
                    ProjectCode = project.ProjectCode,
                    Name = project.Name,
                    Description = project.Description,
                    StartDate = project.StartDate,
                    EndDate = project.EndDate,
                    Status = project.Status,
                    ClientName = project.ClientName,
                    Budget = project.Budget
                };
            }
        }

        public bool AssignMember(int projectId, ProjectMemberDto memberDto)
        {
            lock (_lock)
            {
                var project = _projects.FirstOrDefault(p => p.Id == projectId);
                var emp = _employees.FirstOrDefault(e => e.Id == memberDto.EmployeeId);
                if (project == null || emp == null) return false;

                // Check if already assigned
                var ep = _employeeProjects.FirstOrDefault(e => e.ProjectName == project.Name && e.EmployeeId == emp.Id);
                if (ep != null)
                {
                    ep.RoleInProject = memberDto.RoleInProject;
                    ep.AllocationPercentage = memberDto.AllocationPercentage;
                }
                else
                {
                    _employeeProjects.Add(new EmployeeProject
                    {
                        Id = _employeeProjects.Count > 0 ? _employeeProjects.Max(e => e.Id) + 1 : 1,
                        EmployeeId = emp.Id,
                        ProjectName = project.Name,
                        RoleInProject = memberDto.RoleInProject,
                        AssignedDate = DateTime.Now,
                        AllocationPercentage = memberDto.AllocationPercentage
                    });
                }

                return true;
            }
        }

        // ================= IRecruitmentService =================
        public List<JobPostingDto> GetJobs()
        {
            lock (_lock)
            {
                return _jobPostings.Select(j => new JobPostingDto
                {
                    Id = j.Id,
                    Title = j.Title,
                    Department = j.Department,
                    Description = j.Description,
                    Requirements = j.Requirements,
                    OpeningsCount = j.OpeningsCount,
                    Status = j.Status,
                    PostedDate = j.PostedDate,
                    ClosingDate = j.ClosingDate
                }).ToList();
            }
        }

        public JobPosting CreateJob(JobPosting job)
        {
            lock (_lock)
            {
                job.Id = _jobPostings.Count > 0 ? _jobPostings.Max(j => j.Id) + 1 : 1;
                job.PostedDate = DateTime.Now;
                job.Status = "Active";
                _jobPostings.Add(job);
                return job;
            }
        }

        public List<CandidateDto> GetCandidates(int? jobId = null)
        {
            lock (_lock)
            {
                IEnumerable<Candidate> query = _candidates;
                if (jobId.HasValue)
                    query = query.Where(c => c.JobPostingId == jobId.Value);

                return query.Select(c => new CandidateDto
                {
                    Id = c.Id,
                    JobPostingId = c.JobPostingId,
                    JobTitle = c.JobTitle ?? _jobPostings.FirstOrDefault(j => j.Id == c.JobPostingId)?.Title ?? "Specialist Position",
                    FullName = c.FullName,
                    Email = c.Email,
                    Phone = c.Phone,
                    PipelineStatus = c.PipelineStatus,
                    ResumePath = c.ResumePath,
                    AppliedDate = c.AppliedDate,
                    ExperienceYears = c.ExperienceYears,
                    CurrentSalary = c.CurrentSalary,
                    ExpectedSalary = c.ExpectedSalary
                }).ToList();
            }
        }

        public Candidate UpdateCandidateStatus(int candidateId, string status)
        {
            lock (_lock)
            {
                var candidate = _candidates.FirstOrDefault(c => c.Id == candidateId);
                if (candidate == null) return null;

                candidate.PipelineStatus = status;

                // Auto-create onboarding employee when status changes to 'Hired'
                if (status.ToLower() == "hired" && !_employees.Any(e => e.Remarks == $"Hired Candidate {candidateId}"))
                {
                    var names = candidate.FullName.Split(' ');
                    string first = names.Length > 0 ? names[0] : candidate.FullName;
                    string last = names.Length > 1 ? names[names.Length - 1] : "";

                    var newEmp = new Employee
                    {
                        Id = _employees.Count > 0 ? _employees.Max(e => e.Id) + 1 : 1,
                        EmpCode = $"EMP-{(_employees.Count + 1):D3}",
                        CompanyCode = "RII",
                        BranchCode = "LHE",
                        FirstName = first,
                        LastName = last,
                        Status = "Active",
                        Grade = "B",
                        Type = "Contract",
                        JoiningDate = DateTime.Today.AddDays(7),
                        Remarks = $"Hired Candidate {candidateId}",
                        BasicSalary = 50000,
                        Currency = "PKR"
                    };
                    _employees.Add(newEmp);
                }

                return candidate;
            }
        }
        // public List<InterviewDto> GetInterviews()
        // {
        //     return new List<InterviewDto>();
        // }

        // public Interview ScheduleInterview(Interview interview)
        // {
        //     return interview;
        // }

        // public Interview UpdateInterviewFeedback(int interviewId, string feedback, string rating)
        // {
        //     return null;
        // }

        // ================= IDashboardService =================
        public DashboardStatsDto GetStats()
        {
            lock (_lock)
            {
                var headcount = _employees.Count;
                var active = _employees.Count(e => e.Status == "Active");
                
                decimal payrollCost = 0;
                var lastProcess = _payrollProcesses.OrderByDescending(p => p.Id).FirstOrDefault();
                if (lastProcess != null)
                {
                    payrollCost = lastProcess.TotalNetSalary;
                }
                else
                {
                    // Mock calculation based on current active salaries + allowances
                    payrollCost = _employees.Where(e => e.Status == "Active").Sum(e => e.BasicSalary + e.OtherIncomes.Sum(o => o.Amount));
                }

                var stats = new DashboardStatsDto
                {
                    Headcount = headcount,
                    ActiveEmployees = active,
                    NewHiresThisMonth = _employees.Count(e => e.JoiningDate.HasValue && e.JoiningDate.Value.Month == DateTime.Today.Month && e.JoiningDate.Value.Year == DateTime.Today.Year),
                    ResignedThisMonth = _employees.Count(e => e.LeavingDate.HasValue && e.LeavingDate.Value.Month == DateTime.Today.Month && e.LeavingDate.Value.Year == DateTime.Today.Year),
                    TotalPayrollCost = payrollCost,
                    AverageSalary = active > 0 ? _employees.Where(e => e.Status == "Active").Average(e => e.BasicSalary) : 0,
                    TotalAssets = _assets.Count,
                    AssignedAssets = _assets.Count(a => a.Status == "Assigned")
                };

                // Department distribution
                stats.DepartmentDistribution = _employees
                    .GroupBy(e => e.DepartmentTeams.FirstOrDefault(dt => dt.Type == "Primary")?.Department ?? "General")
                    .Select(g => new DepartmentDistribution { DepartmentName = g.Key, Count = g.Count() })
                    .ToList();

                // Asset Category distribution
                stats.AssetCategoryDistribution = _assets
                    .GroupBy(a => a.Category)
                    .Select(g => new AssetCategoryDistribution { Category = g.Key, Count = g.Count() })
                    .ToList();

                // Monthly payroll history mock
                stats.MonthlyPayrollHistory.Add(new MonthlyPayrollStat { MonthName = "Jan", Cost = payrollCost * 0.9m });
                stats.MonthlyPayrollHistory.Add(new MonthlyPayrollStat { MonthName = "Feb", Cost = payrollCost * 0.95m });
                stats.MonthlyPayrollHistory.Add(new MonthlyPayrollStat { MonthName = "Mar", Cost = payrollCost * 0.98m });
                stats.MonthlyPayrollHistory.Add(new MonthlyPayrollStat { MonthName = "Apr", Cost = payrollCost * 1.0m });
                stats.MonthlyPayrollHistory.Add(new MonthlyPayrollStat { MonthName = "May", Cost = payrollCost });

                return stats;
            }
        }

        // ================= ISetupService =================
        public List<Company> GetCompanies() => _companies;
        public List<Branch> GetBranches(string companyCode = null)
        {
            if (string.IsNullOrEmpty(companyCode)) return _branches;
            return _branches.Where(b => b.CompanyCode == companyCode).ToList();
        }
        public List<DropdownValue> GetDropdowns(string category = null)
        {
            if (string.IsNullOrEmpty(category)) return _dropdowns;
            return _dropdowns.Where(d => d.Category == category).ToList();
        }

        // Helpers
        private EmployeeDetailDto MapToDetailDto(Employee e)
        {
            return new EmployeeDetailDto
            {
                Id = e.Id,
                EmpCode = e.EmpCode,
                CompanyCode = e.CompanyCode,
                BranchCode = e.BranchCode,
                FirstName = e.FirstName,
                MiddleName = e.MiddleName,
                LastName = e.LastName,
                FatherName = e.FatherName,
                FullName = e.FullName,
                Grade = e.Grade,
                Type = e.Type,
                Status = e.Status,
                CNIC = e.CNIC,
                Gender = e.Gender,
                DateOfBirth = e.DateOfBirth,
                JoiningDate = e.JoiningDate,
                JobOfferDate = e.JobOfferDate,
                FinalInterviewDate = e.FinalInterviewDate,
                LeavingDate = e.LeavingDate,
                TerminationDate = e.TerminationDate,
                AnniversaryDate = e.AnniversaryDate,
                MaritalStatus = e.MaritalStatus,
                Age = e.Age,
                NTN = e.NTN,
                Nationality = e.Nationality,
                Religion = e.Religion,
                IndividualOrCompany = e.IndividualOrCompany,
                CNICValidity = e.CNICValidity,
                PassportNo = e.PassportNo,
                PassportValidity = e.PassportValidity,
                LicenceNo = e.LicenceNo,
                LicenceValidity = e.LicenceValidity,
                ReferredBy = e.ReferredBy,
                Remarks = e.Remarks,
                ItOrNonIt = e.ItOrNonIt,
                Outsourced = e.Outsourced,
                Experienced = e.Experienced,
                Certifications = e.Certifications,
                MultipleRoles = e.MultipleRoles,
                External = e.External,
                Remote = e.Remote,
                BasicSalary = e.BasicSalary,
                OnJobSalary = e.OnJobSalary,
                Currency = e.Currency,
                OnJobCurrency = e.OnJobCurrency,
                InvoiceTo = e.InvoiceTo,
                PayMode = e.PayMode,
                PaymentCurrency = e.PaymentCurrency,
                
                Addresses = e.Addresses,
                EmergencyContacts = e.EmergencyContacts,
                BloodRelations = e.BloodRelations,
                HealthRecords = e.HealthRecords,
                EmploymentHistories = e.EmploymentHistories,
                EducationRecords = e.EducationRecords,
                Documents = e.Documents,
                HrLetters = e.HrLetters,
                BankInformation = e.BankInformation,
                TermsAndConditions = e.TermsAndConditions,
                DepartmentTeams = e.DepartmentTeams,
                Projects = e.Projects,
                OtherIncomes = e.OtherIncomes,
                LoansAdvances = e.LoansAdvances,
                SalaryHistories = e.SalaryHistories,
                LineManagerHistories = e.LineManagerHistories,
                FunctionalRoleHistories = e.FunctionalRoleHistories,
                SalaryIncrements = e.SalaryIncrements
            };
        }

        private void UpdateEmployeeFromDto(Employee emp, EmployeeDetailDto dto)
        {
            emp.CompanyCode = dto.CompanyCode;
            emp.BranchCode = dto.BranchCode;
            emp.FirstName = dto.FirstName;
            emp.MiddleName = dto.MiddleName;
            emp.LastName = dto.LastName;
            emp.FatherName = dto.FatherName;
            emp.Grade = dto.Grade;
            emp.Type = dto.Type;
            emp.Status = dto.Status;
            emp.CNIC = dto.CNIC;
            emp.Gender = dto.Gender;
            emp.DateOfBirth = dto.DateOfBirth;
            emp.JoiningDate = dto.JoiningDate;
            emp.JobOfferDate = dto.JobOfferDate;
            emp.FinalInterviewDate = dto.FinalInterviewDate;
            emp.LeavingDate = dto.LeavingDate;
            emp.TerminationDate = dto.TerminationDate;
            emp.AnniversaryDate = dto.AnniversaryDate;
            emp.MaritalStatus = dto.MaritalStatus;
            emp.NTN = dto.NTN;
            emp.Nationality = dto.Nationality;
            emp.Religion = dto.Religion;
            emp.IndividualOrCompany = dto.IndividualOrCompany;
            emp.CNICValidity = dto.CNICValidity;
            emp.PassportNo = dto.PassportNo;
            emp.PassportValidity = dto.PassportValidity;
            emp.LicenceNo = dto.LicenceNo;
            emp.LicenceValidity = dto.LicenceValidity;
            emp.ReferredBy = dto.ReferredBy;
            emp.Remarks = dto.Remarks;
            emp.ItOrNonIt = dto.ItOrNonIt;
            emp.Outsourced = dto.Outsourced;
            emp.Experienced = dto.Experienced;
            emp.Certifications = dto.Certifications;
            emp.MultipleRoles = dto.MultipleRoles;
            emp.External = dto.External;
            emp.Remote = dto.Remote;
            emp.BasicSalary = dto.BasicSalary;
            emp.OnJobSalary = dto.OnJobSalary;
            emp.Currency = dto.Currency;
            emp.OnJobCurrency = dto.OnJobCurrency;
            emp.InvoiceTo = dto.InvoiceTo;
            emp.PayMode = dto.PayMode;
            emp.PaymentCurrency = dto.PaymentCurrency;

            emp.Addresses = dto.Addresses ?? new List<Address>();
            emp.EmergencyContacts = dto.EmergencyContacts ?? new List<EmergencyContact>();
            emp.BloodRelations = dto.BloodRelations ?? new List<BloodRelation>();
            emp.HealthRecords = dto.HealthRecords ?? new List<HealthData>();
            emp.EmploymentHistories = dto.EmploymentHistories ?? new List<EmploymentHistory>();
            emp.EducationRecords = dto.EducationRecords ?? new List<Education>();
            emp.Documents = dto.Documents ?? new List<Document>();
            emp.HrLetters = dto.HrLetters ?? new List<HrLetter>();
            emp.BankInformation = dto.BankInformation;
            emp.TermsAndConditions = dto.TermsAndConditions;
            emp.DepartmentTeams = dto.DepartmentTeams ?? new List<DepartmentTeam>();
            emp.Projects = dto.Projects ?? new List<EmployeeProject>();
            emp.OtherIncomes = dto.OtherIncomes ?? new List<OtherIncome>();
            emp.LoansAdvances = dto.LoansAdvances ?? new List<LoanAdvance>();
            emp.SalaryHistories = dto.SalaryHistories ?? new List<SalaryHistory>();
            emp.LineManagerHistories = dto.LineManagerHistories ?? new List<LineManagerHistory>();
            emp.FunctionalRoleHistories = dto.FunctionalRoleHistories ?? new List<FunctionalRoleHistory>();
            emp.SalaryIncrements = dto.SalaryIncrements ?? new List<SalaryIncrement>();
        }
    }
}
