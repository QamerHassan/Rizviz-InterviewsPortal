using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using RizvizERP.API.Data;
using RizvizERP.API.DTOs;
using RizvizERP.API.Models;

namespace RizvizERP.API.Services
{
    public class DatabaseServices : 
        IAuthService, 
        IEmployeeService, 
        IPayrollService, 
        IInventoryService, 
        IProjectService, 
        IRecruitmentService, 
        IDashboardService, 
        ISetupService
    {
        private readonly ApplicationDbContext _context;
        private static readonly ConcurrentDictionary<string, List<PayrollDetail>> UatPayrollCache = new();

        public DatabaseServices(ApplicationDbContext context)
        {
            _context = context;
            try
            {
                SeedDataIfEmpty();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DatabaseServices] Seed skipped (database unavailable): {ex.Message}");
            }
        }

        private void SeedDataIfEmpty()
        {
            if (UatSchemaConfiguration.IsEnabled) return;
            if (!_context.Database.CanConnect()) return;
            if (_context.Companies.Any()) return;

            // Companies & Branches
            var rii = new Company { CompanyCode = "RII", Name = "Rizviz Int. Impex", TaxId = "NTN-9876543-1", Address = "Main Boulevard, Lahore", Phone = "042-111-222-333", IsActive = true };
            _context.Companies.Add(rii);

            _context.Branches.AddRange(new List<Branch>
            {
                new Branch { BranchCode = "KHI", CompanyCode = "RII", Name = "Karachi Head Office", City = "Karachi", Address = "Clifton, Karachi", IsActive = true },
                new Branch { BranchCode = "LHE", CompanyCode = "RII", Name = "Lahore Tech Branch", City = "Lahore", Address = "DHA Phase 5, Lahore", IsActive = true },
                new Branch { BranchCode = "ISB", CompanyCode = "RII", Name = "Islamabad Executive Branch", City = "Islamabad", Address = "F-7, Islamabad", IsActive = true }
            });

            // Users
            _context.Users.AddRange(new List<User>
            {
                new User { Username = "Rizviz", PasswordHash = "5121472", FullName = "Rizviz Admin", Email = "admin@rizviz.com", RoleName = "Admin", CompanyCode = "RII", BranchCode = "LHE", IsActive = true },
                new User { Username = "admin", PasswordHash = "admin123", FullName = "Admin User", Email = "sysadmin@rizviz.com", RoleName = "Admin", CompanyCode = "RII", BranchCode = "LHE", IsActive = true },
                new User { Username = "hr", PasswordHash = "hr123", FullName = "HR Manager", Email = "hr@rizviz.com", RoleName = "HR", CompanyCode = "RII", BranchCode = "LHE", IsActive = true },
                new User { Username = "manager", PasswordHash = "mgr123", FullName = "Project Manager", Email = "manager@rizviz.com", RoleName = "Manager", CompanyCode = "RII", BranchCode = "LHE", IsActive = true },
                new User { Username = "employee", PasswordHash = "emp123", FullName = "John Doe", Email = "johndoe@rizviz.com", RoleName = "Employee", CompanyCode = "RII", BranchCode = "LHE", IsActive = true }
            });

            // Dropdowns
            string[] grades = { "A+", "A", "B", "C", "D" };
            for (int i = 0; i < grades.Length; i++)
                _context.DropdownValues.Add(new DropdownValue { Category = "Grade", Key = grades[i], Value = $"Grade {grades[i]}", DisplayOrder = i });

            string[] types = { "Permanent", "Contract", "Outsourced", "Intern" };
            for (int i = 0; i < types.Length; i++)
                _context.DropdownValues.Add(new DropdownValue { Category = "EmployeeType", Key = types[i], Value = types[i], DisplayOrder = i });

            string[] statuses = { "Active", "Suspended", "Resigned", "Terminated" };
            for (int i = 0; i < statuses.Length; i++)
                _context.DropdownValues.Add(new DropdownValue { Category = "Status", Key = statuses[i], Value = statuses[i], DisplayOrder = i });

            string[] religions = { "Islam", "Christianity", "Hinduism", "Sikhism", "Other" };
            for (int i = 0; i < religions.Length; i++)
                _context.DropdownValues.Add(new DropdownValue { Category = "Religion", Key = religions[i], Value = religions[i], DisplayOrder = i });

            string[] currencies = { "PKR", "USD", "EUR", "GBP" };
            for (int i = 0; i < currencies.Length; i++)
                _context.DropdownValues.Add(new DropdownValue { Category = "Currency", Key = currencies[i], Value = currencies[i], DisplayOrder = i });

            string[] paymentModes = { "Bank Transfer", "Cash", "Cheque" };
            for (int i = 0; i < paymentModes.Length; i++)
                _context.DropdownValues.Add(new DropdownValue { Category = "PayMode", Key = paymentModes[i], Value = paymentModes[i], DisplayOrder = i });

            _context.SaveChanges();

            // Seed a test employee
            var emp = new Employee
            {
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
                DateOfBirth = new DateTime(1995, 8, 15),
                JoiningDate = new DateTime(2022, 1, 1),
                ItOrNonIt = "IT",
                BasicSalary = 150000,
                OnJobSalary = 150000,
                Currency = "PKR",
                PayMode = "Bank Transfer",
                PaymentCurrency = "PKR",
                TermsAndConditions = "Agreed to corporate standards.",
                BankInformation = new BankInfo { BankName = "Habib Bank Limited", AccountNumber = "1234-56789-01", IBAN = "PK00HABB000012345678901", BranchCode = "0987" }
            };

            emp.Addresses.Add(new Address { Type = "Permanent", StreetAddress = "Model Town, House 42", City = "Lahore", Country = "Pakistan", Phone = "0300-1234567" });
            emp.EmergencyContacts.Add(new EmergencyContact { Name = "Ali Hassan", Relation = "Brother", Phone = "0321-7654321" });
            emp.EducationRecords.Add(new Education { Degree = "BS Computer Science", Institution = "FAST NUCES", PassingYear = 2017, GradeOrGpa = "3.2" });
            emp.FunctionalRoleHistories.Add(new FunctionalRoleHistory { FunctionalRole = "Team Lead", FunctionalTitle = "Senior Software Engineer", LineManager = "Ahmad Ali", EffectiveDate = new DateTime(2022, 1, 1) });
            emp.DepartmentTeams.Add(new DepartmentTeam { Department = "Technology", Team = "Core ERP", Stack = ".NET Core, React", Module = "HR", Type = "Primary" });

            _context.Employees.Add(emp);
            _context.SaveChanges();

            // Seed Assets
            _context.Assets.AddRange(new List<Asset>
            {
                new Asset { AssetCode = "AST-001", Name = "Lenovo ThinkPad L14", Category = "Laptop", SerialNumber = "LNV-88734-X", PurchaseDate = new DateTime(2024, 1, 10), Value = 180000, Status = "Assigned", Remarks = "Excellent condition" },
                new Asset { AssetCode = "AST-002", Name = "Sennheiser HD 250", Category = "Headphones", SerialNumber = "SNH-9002", PurchaseDate = new DateTime(2024, 2, 15), Value = 15000, Status = "Available", Remarks = "Box opened" },
                new Asset { AssetCode = "AST-003", Name = "Corporate SIM Card", Category = "SIM", SerialNumber = "SIM-30012", PurchaseDate = new DateTime(2023, 6, 1), Value = 500, Status = "Available", Remarks = "Jazz Network" }
            });

            _context.AssetAssignments.Add(new AssetAssignment
            {
                AssetId = 1,
                AssetCode = "AST-001",
                AssetName = "Lenovo ThinkPad L14",
                EmployeeId = emp.Id,
                EmployeeName = "Qamer Hassan",
                AssignedDate = new DateTime(2024, 1, 15),
                Status = "Active",
                Condition = "Brand New"
            });

            // Seed Projects
            var prj1 = new Project { ProjectCode = "PRJ-001", Name = "Enterprise ERP Migration", Description = "Migrating legacy services to modern stack", StartDate = new DateTime(2026, 1, 1), EndDate = new DateTime(2026, 12, 31), Status = "In Progress", ClientName = "Rizviz Int. Impex", Budget = 5000000 };
            var prj2 = new Project { ProjectCode = "PRJ-002", Name = "Kids Bazaar Platform", Description = "Scale children e-commerce portal", StartDate = new DateTime(2026, 3, 1), EndDate = new DateTime(2026, 8, 31), Status = "In Progress", ClientName = "Kids Bazaar Ltd", Budget = 2500000 };
            _context.Projects.AddRange(prj1, prj2);
            _context.SaveChanges();

            _context.EmployeeProjects.AddRange(new List<EmployeeProject>
            {
                new EmployeeProject { EmployeeId = emp.Id, ProjectName = "Enterprise ERP Migration", RoleInProject = "Lead Developer", AssignedDate = new DateTime(2026, 2, 1), AllocationPercentage = 80 },
                new EmployeeProject { EmployeeId = emp.Id, ProjectName = "Kids Bazaar Platform", RoleInProject = "Advisor", AssignedDate = new DateTime(2026, 4, 1), AllocationPercentage = 20 }
            });

            // Seed Jobs & Candidates
            var job1 = new JobPosting { Title = "Senior Dotnet Developer", Department = "Technology", Description = "Looking for strong .NET Core experience", Requirements = "5+ Years, EF Core, Web API", OpeningsCount = 2, Status = "Active", PostedDate = DateTime.Today.AddDays(-10) };
            var job2 = new JobPosting { Title = "React UI Engineer", Department = "Technology", Description = "Ant Design & Tailwind expertise required", Requirements = "3+ Years, Redux Toolkit", OpeningsCount = 1, Status = "Active", PostedDate = DateTime.Today.AddDays(-5) };
            _context.JobPostings.AddRange(job1, job2);
            _context.SaveChanges();

            var cand1 = new Candidate { JobPostingId = job1.Id, JobTitle = "Senior Dotnet Developer", FullName = "Ahmad Khan", Email = "ahmad@gmail.com", Phone = "0312-3456789", PipelineStatus = "Interview", AppliedDate = DateTime.Today.AddDays(-7), ExperienceYears = "6", CurrentSalary = "160000", ExpectedSalary = "220000" };
            var cand2 = new Candidate { JobPostingId = job2.Id, JobTitle = "React UI Engineer", FullName = "Sarah Smith", Email = "sarah@gmail.com", Phone = "0333-1112223", PipelineStatus = "Applied", AppliedDate = DateTime.Today.AddDays(-3), ExperienceYears = "3", CurrentSalary = "100000", ExpectedSalary = "140000" };
            _context.Candidates.AddRange(cand1, cand2);
            _context.SaveChanges();

        // _context.Interviews.Add(new Interview
        // {
        //     CandidateId = cand1.Id,
        //     CandidateName = "Ahmad Khan",
        //     JobTitle = "Senior Dotnet Developer",
        //     ScheduleTime = DateTime.Today.AddDays(1).AddHours(14),
        //     InterviewerName = "Qamer Hassan",
        //     Round = "Technical Round",
        //     Status = "Scheduled",
        //     Feedback = "",
        //     Rating = ""
        // });

            _context.SaveChanges();
        }

        // ================= IAuthService =================
        public LoginResponse Login(LoginRequest request)
        {
            var user = AuthHelper.AuthenticateUser(request.Username, request.Password);

            if (user == null) return null;

            var sessionId = Guid.NewGuid().ToString("N");
            return new LoginResponse
            {
                Token = "db_jwt_mock_token_key_for_" + user.Username + "_session_" + sessionId,
                RefreshToken = "db_refresh_token_key_" + Guid.NewGuid().ToString("N"),
                UserId = user.Id,
                Username = user.Username,
                FullName = user.FullName,
                Role = user.RoleName,
                InterviewName = user.InterviewName,
                CompanyCode = user.CompanyCode ?? "RII",
                BranchCode = user.BranchCode ?? "LHE",
                IsFirstLogin = user.IsFirstLogin
            };
        }

        public LoginResponse RefreshToken(TokenRefreshRequest request)
        {
            var originalToken = request.Token ?? "";
            var username = AuthHelper.GetUsernameFromToken(originalToken) ?? "user";
            var sessionId = AuthHelper.GetSessionIdFromToken(originalToken) ?? Guid.NewGuid().ToString("N");

            var user = AuthHelper.GetUserByUsername(username);

            return new LoginResponse
            {
                Token = "db_jwt_mock_token_key_for_" + username + "_session_" + sessionId,
                RefreshToken = "db_refresh_token_key_" + Guid.NewGuid().ToString("N"),
                UserId = user?.Id ?? 1,
                Username = username,
                FullName = user?.FullName ?? username,
                Role = user?.RoleName ?? "HR",
                InterviewName = user?.InterviewName,
                CompanyCode = user?.CompanyCode ?? "RII",
                BranchCode = user?.BranchCode ?? "LHE",
                IsFirstLogin = user?.IsFirstLogin ?? false
            };
        }

        public void LogAction(string username, string action, string module, string ipAddress)
        {
            if (UatSchemaConfiguration.IsEnabled) return;

            _context.AuditLogs.Add(new AuditLog
            {
                Username = username,
                Action = action,
                Module = module,
                Timestamp = DateTime.UtcNow,
                IpAddress = ipAddress ?? "127.0.0.1"
            });
            _context.SaveChanges();
        }

        public List<AuditLog> GetAuditLogs()
        {
            return _context.AuditLogs.OrderByDescending(a => a.Timestamp).Take(100).ToList();
        }

        // ================= IEmployeeService =================
        public EmployeeStatsDto GetEmployeeStats()
        {
            var emps = _context.Employees.AsNoTracking().ToList();
            int active = 0, suspended = 0, terminated = 0;

            foreach (var e in emps)
            {
                if (UatSchemaConfiguration.IsEnabled)
                {
                    switch (UatEmployeeStatus.GetGroup(e.Status))
                    {
                        case UatEmployeeStatus.GroupSuspended: suspended++; break;
                        case UatEmployeeStatus.GroupTerminated: terminated++; break;
                        default: active++; break;
                    }
                }
                else
                {
                    var s = e.Status ?? "";
                    if (s.Equals("Suspended", StringComparison.OrdinalIgnoreCase)) suspended++;
                    else if (s.Equals("Terminated", StringComparison.OrdinalIgnoreCase) || s.Equals("Resigned", StringComparison.OrdinalIgnoreCase)) terminated++;
                    else if (s.Equals("Active", StringComparison.OrdinalIgnoreCase)) active++;
                    else active++;
                }
            }

            return new EmployeeStatsDto
            {
                Total = emps.Count,
                Active = active,
                SuspendedLeave = suspended,
                Terminated = terminated
            };
        }

        public List<EmployeeSummaryDto> GetAll(string search = null, string branchCode = null, string status = null, string statusGroup = null)
        {
            IQueryable<Employee> query = UatSchemaConfiguration.IsEnabled
                ? _context.Employees.AsNoTracking()
                : _context.Employees
                    .Include(e => e.DepartmentTeams)
                    .Include(e => e.FunctionalRoleHistories);

            if (!string.IsNullOrEmpty(branchCode))
                query = query.Where(e => e.BranchCode == branchCode);

            if (!string.IsNullOrEmpty(status))
                query = query.Where(e => e.Status == status);

            if (!string.IsNullOrEmpty(search))
            {
                string lSearch = search.ToLower();
                query = query.Where(e => e.FirstName.ToLower().Contains(lSearch) || 
                                         e.LastName.ToLower().Contains(lSearch) || 
                                         e.EmpCode.ToLower().Contains(lSearch) || 
                                         e.CNIC.Contains(search));
            }

            var list = query.ToList();

            if (!string.IsNullOrEmpty(statusGroup) && statusGroup != UatEmployeeStatus.GroupAll)
            {
                if (UatSchemaConfiguration.IsEnabled)
                    list = list.Where(e => UatEmployeeStatus.MatchesGroup(e.Status, statusGroup)).ToList();
                else
                    list = list.Where(e => string.Equals(e.Status, statusGroup, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            return list.Select(e => new EmployeeSummaryDto
            {
                Id = e.Id,
                EmpCode = e.EmpCode,
                FullName = BuildEmployeeDisplayName(e),
                Grade = e.Grade,
                Type = e.Type,
                Status = UatSchemaConfiguration.IsEnabled ? UatEmployeeStatus.Normalize(e.Status) : e.Status,
                CNIC = e.CNIC,
                Gender = e.Gender,
                ItOrNonIt = e.ItOrNonIt,
                JoiningDate = e.JoiningDate,
                BasicSalary = e.BasicSalary,
                Department = UatSchemaConfiguration.IsEnabled
                    ? (e.ItOrNonIt ?? "Unassigned")
                    : (e.DepartmentTeams.FirstOrDefault(d => d.Type == "Primary")?.Department ?? "Unassigned"),
                Designation = UatSchemaConfiguration.IsEnabled
                    ? (string.IsNullOrWhiteSpace(e.Grade) ? "—" : e.Grade)
                    : (e.FunctionalRoleHistories.LastOrDefault()?.FunctionalTitle ?? "Software Engineer")
            }).ToList();
        }

        public EmployeeDetailDto GetById(int id)
        {
            if (UatSchemaConfiguration.IsEnabled)
            {
                var basic = _context.Employees.AsNoTracking().FirstOrDefault(e => e.Id == id);
                if (basic == null) return null;
                var dto = MapToDetailDto(basic);
                dto.FullName = BuildEmployeeDisplayName(basic);
                dto.BankInformation = UatDataQueries.GetBankInfo(_context, id, basic.EmpCode);
                return dto;
            }

            var emp = _context.Employees
                .Include(e => e.Addresses)
                .Include(e => e.EmergencyContacts)
                .Include(e => e.BloodRelations)
                .Include(e => e.HealthRecords)
                .Include(e => e.EmploymentHistories)
                .Include(e => e.EducationRecords)
                .Include(e => e.Documents)
                .Include(e => e.HrLetters)
                .Include(e => e.BankInformation)
                .Include(e => e.DepartmentTeams)
                .Include(e => e.Projects)
                .Include(e => e.OtherIncomes)
                .Include(e => e.LoansAdvances)
                .Include(e => e.SalaryHistories)
                .Include(e => e.LineManagerHistories)
                .Include(e => e.FunctionalRoleHistories)
                .Include(e => e.SalaryIncrements)
                .FirstOrDefault(e => e.Id == id);

            return emp != null ? MapToDetailDto(emp) : null;
        }

        public EmployeeDetailDto Create(EmployeeDetailDto dto)
        {
            var emp = new Employee();
            UpdateEmployeeFromDto(emp, dto);
            
            _context.Employees.Add(emp);
            _context.SaveChanges();

            // Set the generated employee code
            emp.EmpCode = $"EMP-{emp.Id:D3}";
            _context.SaveChanges();
            
            return MapToDetailDto(emp);
        }

        public EmployeeDetailDto Update(int id, EmployeeDetailDto dto)
        {
            var emp = _context.Employees
                .Include(e => e.Addresses)
                .Include(e => e.EmergencyContacts)
                .Include(e => e.BloodRelations)
                .Include(e => e.HealthRecords)
                .Include(e => e.EmploymentHistories)
                .Include(e => e.EducationRecords)
                .Include(e => e.Documents)
                .Include(e => e.HrLetters)
                .Include(e => e.BankInformation)
                .Include(e => e.DepartmentTeams)
                .Include(e => e.Projects)
                .Include(e => e.OtherIncomes)
                .Include(e => e.LoansAdvances)
                .Include(e => e.SalaryHistories)
                .Include(e => e.LineManagerHistories)
                .Include(e => e.FunctionalRoleHistories)
                .Include(e => e.SalaryIncrements)
                .FirstOrDefault(e => e.Id == id);

            if (emp == null) return null;

            // Clean existing child elements first to prevent orphaned records in EF Core
            _context.Addresses.RemoveRange(emp.Addresses);
            _context.EmergencyContacts.RemoveRange(emp.EmergencyContacts);
            _context.BloodRelations.RemoveRange(emp.BloodRelations);
            _context.HealthRecords.RemoveRange(emp.HealthRecords);
            _context.EmploymentHistories.RemoveRange(emp.EmploymentHistories);
            _context.EducationRecords.RemoveRange(emp.EducationRecords);
            _context.DepartmentTeams.RemoveRange(emp.DepartmentTeams);
            _context.EmployeeProjects.RemoveRange(emp.Projects);
            _context.OtherIncomes.RemoveRange(emp.OtherIncomes);
            _context.LoansAdvances.RemoveRange(emp.LoansAdvances);
            _context.SalaryHistories.RemoveRange(emp.SalaryHistories);
            _context.LineManagerHistories.RemoveRange(emp.LineManagerHistories);
            _context.FunctionalRoleHistories.RemoveRange(emp.FunctionalRoleHistories);
            _context.SalaryIncrements.RemoveRange(emp.SalaryIncrements);
            if (emp.BankInformation != null) _context.BankInformations.Remove(emp.BankInformation);
            
            _context.SaveChanges();

            UpdateEmployeeFromDto(emp, dto);
            _context.SaveChanges();

            return MapToDetailDto(emp);
        }

        public bool Delete(int id)
        {
            var emp = _context.Employees.FirstOrDefault(e => e.Id == id);
            if (emp == null) return false;
            
            _context.Employees.Remove(emp);
            _context.SaveChanges();
            return true;
        }

        public List<SalaryHistory> GetSalaryHistory(int employeeId)
        {
            if (UatSchemaConfiguration.IsEnabled)
            {
                var empCode = UatDataQueries.GetEmpCode(_context, employeeId);
                return UatDataQueries.GetSalaryHistory(_context, employeeId, empCode);
            }
            return _context.SalaryHistories.Where(sh => sh.EmployeeId == employeeId).ToList();
        }

        public List<Document> GetDocuments(int employeeId)
        {
            if (UatSchemaConfiguration.IsEnabled)
            {
                var empCode = UatDataQueries.GetEmpCode(_context, employeeId);
                return UatDataQueries.GetDocuments(_context, employeeId, empCode);
            }
            return _context.Documents.Where(d => d.EmployeeId == employeeId).ToList();
        }

        public Document SaveDocument(int employeeId, string docType, string fileName, string filePath)
        {
            if (UatSchemaConfiguration.IsEnabled)
            {
                return new Document
                {
                    Id = 0,
                    EmployeeId = employeeId,
                    DocumentType = docType,
                    DocumentName = fileName,
                    FilePath = filePath,
                    UploadedAt = DateTime.UtcNow
                };
            }
            var doc = new Document
            {
                EmployeeId = employeeId,
                DocumentType = docType,
                DocumentName = fileName,
                FilePath = filePath,
                UploadedAt = DateTime.UtcNow
            };
            _context.Documents.Add(doc);
            _context.SaveChanges();
            return doc;
        }

        // ================= IPayrollService =================
        public List<PayrollDetail> GetMonthlyPayroll(int year, int month)
        {
            if (UatSchemaConfiguration.IsEnabled)
            {
                var key = PayrollCacheKey(year, month);
                return UatPayrollCache.TryGetValue(key, out var cached) ? cached : new List<PayrollDetail>();
            }

            var process = _context.PayrollProcesses.FirstOrDefault(p => p.Year == year && p.Month == month);
            if (process == null) return new List<PayrollDetail>();

            return _context.PayrollDetails.Where(pd => pd.PayrollProcessId == process.Id).ToList();
        }

        public List<PayrollDetail> ProcessPayroll(PayrollProcessRequest request)
        {
            if (UatSchemaConfiguration.IsEnabled)
                return ProcessUatPayroll(request);

            // Remove existing process for this month if any
            var existingProcess = _context.PayrollProcesses.FirstOrDefault(p => p.Year == request.Year && p.Month == request.Month);
            if (existingProcess != null)
            {
                var details = _context.PayrollDetails.Where(d => d.PayrollProcessId == existingProcess.Id);
                _context.PayrollDetails.RemoveRange(details);
                _context.PayrollProcesses.Remove(existingProcess);
                _context.SaveChanges();
            }

            var employees = _context.Employees
                .Include(e => e.DepartmentTeams)
                .Include(e => e.FunctionalRoleHistories)
                .Include(e => e.BankInformation)
                .Where(e => e.Status == "Active")
                .ToList();

            var process = new PayrollProcess
            {
                Year = request.Year,
                Month = request.Month,
                ProcessedDate = DateTime.Now,
                ProcessedBy = "hr",
                IsConfirmed = true
            };
            _context.PayrollProcesses.Add(process);
            _context.SaveChanges();

            var detailsList = new List<PayrollDetail>();
            foreach (var emp in employees)
            {
                decimal allowances = emp.BasicSalary * 0.55m; // House Rent + Utilities
                decimal tax = emp.BasicSalary > 100000 ? emp.BasicSalary * 0.10m : emp.BasicSalary * 0.05m;
                decimal net = emp.BasicSalary + allowances - tax;

                var detail = new PayrollDetail
                {
                    PayrollProcessId = process.Id,
                    EmployeeId = emp.Id,
                    EmpCode = emp.EmpCode,
                    EmployeeName = emp.FullName,
                    Department = emp.DepartmentTeams.FirstOrDefault(d => d.Type == "Primary")?.Department ?? "Technology",
                    Designation = emp.FunctionalRoleHistories.LastOrDefault()?.FunctionalTitle ?? "Software Engineer",
                    BasicSalary = emp.BasicSalary,
                    Allowances = allowances,
                    Deductions = tax,
                    TaxAmount = tax,
                    LoanDeduction = 0,
                    NetSalary = net,
                    PayMode = emp.PayMode ?? "Bank Transfer",
                    BankName = emp.BankInformation?.BankName ?? "N/A",
                    AccountNumber = emp.BankInformation?.AccountNumber ?? "N/A",
                    IsPaid = true,
                    PaidDate = DateTime.Now
                };
                _context.PayrollDetails.Add(detail);
                detailsList.Add(detail);
            }

            process.TotalBasicSalary = detailsList.Sum(d => d.BasicSalary);
            process.TotalAllowances = detailsList.Sum(d => d.Allowances);
            process.TotalDeductions = detailsList.Sum(d => d.Deductions);
            process.TotalNetSalary = detailsList.Sum(d => d.NetSalary);

            _context.SaveChanges();
            return detailsList;
        }

        public PayslipDto GetPayslip(int employeeId, int month, int year)
        {
            if (UatSchemaConfiguration.IsEnabled)
                return GetUatPayslip(employeeId, month, year);

            var emp = _context.Employees
                .Include(e => e.DepartmentTeams)
                .Include(e => e.FunctionalRoleHistories)
                .Include(e => e.BankInformation)
                .FirstOrDefault(e => e.Id == employeeId);

            var process = _context.PayrollProcesses.FirstOrDefault(p => p.Year == year && p.Month == month);
            var detail = process != null ? _context.PayrollDetails.FirstOrDefault(d => d.PayrollProcessId == process.Id && d.EmployeeId == employeeId) : null;

            if (emp == null) return null;

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

        private static string PayrollCacheKey(int year, int month) => $"{year}-{month:D2}";

        private List<PayrollDetail> ProcessUatPayroll(PayrollProcessRequest request)
        {
            var employees = _context.Employees.AsNoTracking()
                .Where(e => e.Status == "Active" || e.Status == "1")
                .ToList();

            var processId = request.Year * 100 + request.Month;
            var detailsList = new List<PayrollDetail>();
            var rowId = 1;

            foreach (var emp in employees)
            {
                decimal allowances = emp.BasicSalary * 0.55m;
                decimal tax = emp.BasicSalary > 100000 ? emp.BasicSalary * 0.10m : emp.BasicSalary * 0.05m;
                decimal net = emp.BasicSalary + allowances - tax;

                detailsList.Add(new PayrollDetail
                {
                    Id = rowId++,
                    PayrollProcessId = processId,
                    EmployeeId = emp.Id,
                    EmpCode = emp.EmpCode,
                    EmployeeName = BuildEmployeeDisplayName(emp),
                    Department = "General",
                    Designation = string.IsNullOrWhiteSpace(emp.Grade) ? "Employee" : emp.Grade,
                    BasicSalary = emp.BasicSalary,
                    Allowances = allowances,
                    Deductions = tax,
                    TaxAmount = tax,
                    LoanDeduction = 0,
                    NetSalary = net,
                    PayMode = string.IsNullOrWhiteSpace(emp.PayMode) ? "Bank Transfer" : emp.PayMode,
                    BankName = "N/A",
                    AccountNumber = "N/A",
                    IsPaid = true,
                    PaidDate = DateTime.Now
                });
            }

            UatPayrollCache[PayrollCacheKey(request.Year, request.Month)] = detailsList;
            return detailsList;
        }

        private PayslipDto GetUatPayslip(int employeeId, int month, int year)
        {
            var emp = _context.Employees.AsNoTracking().FirstOrDefault(e => e.Id == employeeId);
            if (emp == null) return null;

            var key = PayrollCacheKey(year, month);
            PayrollDetail detail = null;
            if (UatPayrollCache.TryGetValue(key, out var payroll))
                detail = payroll.FirstOrDefault(d => d.EmployeeId == employeeId);

            var bank = UatDataQueries.GetBankInfo(_context, employeeId, emp.EmpCode);
            decimal basic = detail?.BasicSalary ?? emp.BasicSalary;
            decimal allowances = detail?.Allowances ?? (emp.BasicSalary * 0.55m);
            decimal tax = detail?.TaxAmount ?? (emp.BasicSalary > 100000 ? emp.BasicSalary * 0.10m : emp.BasicSalary * 0.05m);

            return new PayslipDto
            {
                EmployeeId = employeeId,
                EmpCode = emp.EmpCode,
                EmployeeName = BuildEmployeeDisplayName(emp),
                Department = detail?.Department ?? "General",
                Designation = detail?.Designation ?? emp.Grade ?? "Employee",
                Month = month,
                Year = year,
                BasicSalary = basic,
                Allowances = allowances,
                Deductions = detail?.Deductions ?? tax,
                TaxAmount = tax,
                LoanDeduction = detail?.LoanDeduction ?? 0,
                NetSalary = detail?.NetSalary ?? (basic + allowances - tax),
                PayMode = detail?.PayMode ?? emp.PayMode ?? "Cash",
                BankName = detail?.BankName ?? bank?.BankName,
                AccountNumber = detail?.AccountNumber ?? bank?.AccountNumber,
                IBAN = bank?.IBAN
            };
        }

        // ================= IInventoryService =================
        public List<AssetDto> GetAllAssets(string category = null, string status = null)
        {
            if (UatSchemaConfiguration.IsEnabled && UatSchemaConfiguration.UseLiveAssetsView)
            {
                try
                {
                    return UatAssetDataQueries.GetAllAssets(_context, category, status);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[Inventory] UAT assets query failed: {ex.Message}");
                }
            }

            IQueryable<Asset> query = _context.Assets;
            if (!string.IsNullOrEmpty(category)) query = query.Where(a => a.Category == category);
            if (!string.IsNullOrEmpty(status)) query = query.Where(a => a.Status == status);

            var list = query.ToList();
            var assignments = _context.AssetAssignments.Where(aa => aa.Status == "Active").ToList();

            return list.Select(a => {
                var assignment = assignments.FirstOrDefault(aa => aa.AssetId == a.Id);
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

        public Asset CreateAsset(Asset asset)
        {
            _context.Assets.Add(asset);
            _context.SaveChanges();
            asset.AssetCode = $"AST-{asset.Category.Substring(0, Math.Min(3, asset.Category.Length)).ToUpper()}-{asset.Id:D3}";
            asset.Status = "Available";
            _context.SaveChanges();
            return asset;
        }

        public AssetAssignment AssignAsset(AssetAssignmentRequest request)
        {
            var asset = _context.Assets.FirstOrDefault(a => a.Id == request.AssetId);
            var emp = _context.Employees.FirstOrDefault(e => e.Id == request.EmployeeId);
            if (asset == null || emp == null) return null;

            // Update asset status
            asset.Status = "Assigned";

            // Deactivate existing assignments for this asset just in case
            var activeAssignments = _context.AssetAssignments.Where(aa => aa.AssetId == asset.Id && aa.Status == "Active");
            foreach (var aa in activeAssignments)
            {
                aa.Status = "Returned";
                aa.ReturnedDate = DateTime.Now;
            }

            var assignment = new AssetAssignment
            {
                AssetId = asset.Id,
                AssetCode = asset.AssetCode,
                AssetName = asset.Name,
                EmployeeId = emp.Id,
                EmployeeName = emp.FullName,
                AssignedDate = DateTime.Now,
                Status = "Active",
                Condition = request.Condition ?? "Good"
            };

            _context.AssetAssignments.Add(assignment);
            _context.SaveChanges();
            return assignment;
        }

        public bool ReturnAsset(int assetId, string condition)
        {
            var assignment = _context.AssetAssignments.FirstOrDefault(aa => aa.AssetId == assetId && aa.Status == "Active");
            if (assignment == null) return false;

            assignment.Status = "Returned";
            assignment.ReturnedDate = DateTime.Now;
            assignment.Condition = condition;

            var asset = _context.Assets.FirstOrDefault(a => a.Id == assetId);
            if (asset != null)
            {
                asset.Status = "Available";
                asset.Remarks = $"Returned. Condition: {condition}";
            }

            _context.SaveChanges();
            return true;
        }

        // ================= IProjectService =================
        private static bool IsActiveProjectStatus(string status) =>
            !string.IsNullOrWhiteSpace(status)
            && (status.Equals("In Progress", StringComparison.OrdinalIgnoreCase)
                || status.Equals("In-Progress", StringComparison.OrdinalIgnoreCase)
                || status == "I");

        public ProjectStatsDto GetProjectStats()
        {
            var projects = _context.Projects.AsNoTracking().ToList();
            Dictionary<int, List<ProjectMemberDto>> membersByCode = null;
            if (UatSchemaConfiguration.IsEnabled && UatSchemaConfiguration.UseLiveProjectsView)
                membersByCode = UatProjectDataQueries.GetMembersByProjectCode(_context);
            else
            {
                var assignments = _context.EmployeeProjects.AsNoTracking().ToList();
                membersByCode = projects.ToDictionary(
                    p => p.Id,
                    p => assignments.Where(a => a.ProjectName == p.Name).Select(a => new ProjectMemberDto
                    {
                        EmployeeId = a.EmployeeId,
                        EmployeeName = _context.Employees.AsNoTracking().FirstOrDefault(e => e.Id == a.EmployeeId)?.FirstName ?? "N/A",
                        RoleInProject = a.RoleInProject,
                        AllocationPercentage = a.AllocationPercentage
                    }).ToList());
            }

            int totalAllocations = 0;
            int withTeam = 0;
            foreach (var p in projects)
            {
                var count = membersByCode.TryGetValue(p.Id, out var m) ? m.Count : 0;
                totalAllocations += count;
                if (count > 0) withTeam++;
            }

            return new ProjectStatsDto
            {
                Total = projects.Count,
                Active = projects.Count(p => IsActiveProjectStatus(p.Status)),
                ResourceAllocations = totalAllocations,
                WithTeamMembers = withTeam
            };
        }

        public List<ProjectDto> GetAllProjects(string metric = null, string search = null)
        {
            var projects = _context.Projects.AsNoTracking().ToList();

            Dictionary<int, List<ProjectMemberDto>> membersByCode;
            if (UatSchemaConfiguration.IsEnabled && UatSchemaConfiguration.UseLiveProjectsView)
                membersByCode = UatProjectDataQueries.GetMembersByProjectCode(_context);
            else
            {
                var assignments = _context.EmployeeProjects.AsNoTracking().ToList();
                membersByCode = projects.ToDictionary(
                    p => p.Id,
                    p => assignments.Where(a => a.ProjectName == p.Name).Select(a => new ProjectMemberDto
                    {
                        EmployeeId = a.EmployeeId,
                        EmployeeName = _context.Employees.AsNoTracking().FirstOrDefault(e => e.Id == a.EmployeeId)?.FirstName ?? "N/A",
                        RoleInProject = a.RoleInProject,
                        AllocationPercentage = a.AllocationPercentage
                    }).ToList());
            }

            var list = projects.Select(p => new ProjectDto
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
                Members = membersByCode.TryGetValue(p.Id, out var members) ? members : new List<ProjectMemberDto>()
            }).ToList();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLowerInvariant();
                list = list.Where(p =>
                    (p.Name != null && p.Name.ToLowerInvariant().Contains(term)) ||
                    (p.ProjectCode != null && p.ProjectCode.ToLowerInvariant().Contains(term)) ||
                    (p.ClientName != null && p.ClientName.ToLowerInvariant().Contains(term)) ||
                    (p.Description != null && p.Description.ToLowerInvariant().Contains(term))).ToList();
            }

            if (!string.IsNullOrEmpty(metric) && metric != "all")
            {
                list = metric.ToLowerInvariant() switch
                {
                    "active" => list.Where(p => IsActiveProjectStatus(p.Status)).ToList(),
                    "allocations" => list.Where(p => p.Members != null && p.Members.Count > 0).ToList(),
                    "with_team" => list.Where(p => p.Members != null && p.Members.Count > 0).ToList(),
                    _ => list
                };
            }

            return list.OrderByDescending(p => IsActiveProjectStatus(p.Status))
                .ThenBy(p => p.Name)
                .ToList();
        }

        public ProjectDto CreateProject(Project project)
        {
            if (UatSchemaConfiguration.IsEnabled && UatSchemaConfiguration.UseLiveProjectsView)
                throw new InvalidOperationException("Projects are read-only from UAT (mkt.Projects).");

            _context.Projects.Add(project);
            _context.SaveChanges();
            project.ProjectCode = $"PRJ-{project.Id:D3}";
            project.Status = "In Progress";
            _context.SaveChanges();

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
                Budget = project.Budget,
                Members = new List<ProjectMemberDto>()
            };
        }

        public bool AssignMember(int projectId, ProjectMemberDto memberDto)
        {
            if (UatSchemaConfiguration.IsEnabled && UatSchemaConfiguration.UseLiveProjectsView)
                return false;

            var prj = _context.Projects.FirstOrDefault(p => p.Id == projectId);
            if (prj == null) return false;

            // Remove existing member assignment on this project to update it
            var existingAssignment = _context.EmployeeProjects
                .FirstOrDefault(ep => ep.EmployeeId == memberDto.EmployeeId && ep.ProjectName == prj.Name);

            if (existingAssignment != null)
            {
                existingAssignment.RoleInProject = memberDto.RoleInProject;
                existingAssignment.AllocationPercentage = memberDto.AllocationPercentage;
                existingAssignment.AssignedDate = DateTime.Now;
            }
            else
            {
                var newAssign = new EmployeeProject
                {
                    EmployeeId = memberDto.EmployeeId,
                    ProjectName = prj.Name,
                    RoleInProject = memberDto.RoleInProject,
                    AssignedDate = DateTime.Now,
                    AllocationPercentage = memberDto.AllocationPercentage
                };
                _context.EmployeeProjects.Add(newAssign);
            }

            _context.SaveChanges();
            return true;
        }

        // ================= IRecruitmentService =================
        public List<JobPostingDto> GetJobs()
        {
            var jobs = _context.JobPostings.ToList();

            return jobs.Select(j => new JobPostingDto
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

        public JobPosting CreateJob(JobPosting job)
        {
            job.PostedDate = DateTime.Today;
            job.Status = "Active";
            _context.JobPostings.Add(job);
            _context.SaveChanges();
            return job;
        }

        public List<CandidateDto> GetCandidates(int? jobId = null)
        {
            IQueryable<Candidate> query = _context.Candidates;
            if (jobId.HasValue) query = query.Where(c => c.JobPostingId == jobId.Value);

            return query.Select(c => new CandidateDto
            {
                Id = c.Id,
                JobPostingId = c.JobPostingId,
                JobTitle = c.JobTitle,
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

        public Candidate UpdateCandidateStatus(int candidateId, string status)
        {
            var cand = _context.Candidates.FirstOrDefault(c => c.Id == candidateId);
            if (cand == null) return null;

            cand.PipelineStatus = status;
            _context.SaveChanges();

            // Auto-onboard as employee if hired
            if (status == "Hired")
            {
                var names = cand.FullName.Split(' ');
                string first = names.Length > 0 ? names[0] : cand.FullName;
                string last = names.Length > 1 ? names[names.Length - 1] : "";

                var newEmp = new Employee
                {
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
                _context.Employees.Add(newEmp);
                _context.SaveChanges();

                newEmp.EmpCode = $"EMP-{newEmp.Id:D3}";
                _context.SaveChanges();
            }

            return cand;
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
            var emps = UatSchemaConfiguration.IsEnabled
                ? _context.Employees.AsNoTracking().ToList()
                : _context.Employees.ToList();

            List<Asset> assets;
            try { assets = _context.Assets.AsNoTracking().ToList(); }
            catch { assets = new List<Asset>(); }

            static bool IsActiveEmployee(Employee e) =>
                string.Equals(e.Status, "Active", StringComparison.OrdinalIgnoreCase)
                || e.Status == "1"
                || e.Status == "A";

            var headcount = emps.Count;
            var activeList = emps.Where(IsActiveEmployee).ToList();
            var active = activeList.Count;

            decimal payrollCost = activeList.Sum(e => e.BasicSalary + e.OnJobSalary);
            try
            {
                var lastProcess = _context.PayrollProcesses.OrderByDescending(p => p.Id).FirstOrDefault();
                if (lastProcess != null)
                    payrollCost = lastProcess.TotalNetSalary;
            }
            catch
            {
                // Payroll tables may not exist yet in UAT — use salary sum from employees
            }

            var stats = new DashboardStatsDto
            {
                Headcount = headcount,
                ActiveEmployees = active,
                NewHiresThisMonth = emps.Count(e => e.JoiningDate.HasValue && e.JoiningDate.Value.Month == DateTime.Today.Month && e.JoiningDate.Value.Year == DateTime.Today.Year),
                ResignedThisMonth = emps.Count(e => e.LeavingDate.HasValue && e.LeavingDate.Value.Month == DateTime.Today.Month && e.LeavingDate.Value.Year == DateTime.Today.Year),
                TotalPayrollCost = payrollCost,
                AverageSalary = active > 0 ? activeList.Average(e => e.BasicSalary) : 0,
                TotalAssets = assets.Count,
                AssignedAssets = assets.Count(a => string.Equals(a.Status, "Assigned", StringComparison.OrdinalIgnoreCase)),
                MonthlyPayrollHistory = new List<MonthlyPayrollStat>(),
                DepartmentDistribution = new List<DepartmentDistribution>(),
                AssetCategoryDistribution = new List<AssetCategoryDistribution>()
            };

            stats.DepartmentDistribution = emps
                .GroupBy(e => string.IsNullOrWhiteSpace(e.Grade) ? (e.ItOrNonIt ?? "General") : e.Grade)
                .Select(g => new DepartmentDistribution { DepartmentName = g.Key, Count = g.Count() })
                .OrderByDescending(d => d.Count)
                .Take(10)
                .ToList();

            stats.AssetCategoryDistribution = assets
                .GroupBy(a => string.IsNullOrWhiteSpace(a.Category) ? "Other" : a.Category)
                .Select(g => new AssetCategoryDistribution { Category = g.Key, Count = g.Count() })
                .ToList();

            var monthNames = new[] { "Jan", "Feb", "Mar", "Apr", "May", "Jun" };
            for (var i = 0; i < monthNames.Length; i++)
                stats.MonthlyPayrollHistory.Add(new MonthlyPayrollStat { MonthName = monthNames[i], Cost = payrollCost * (0.85m + (i * 0.03m)) });

            return stats;
        }

        // ================= ISetupService =================
        public List<Company> GetCompanies() => _context.Companies.ToList();
        public List<Branch> GetBranches(string companyCode = null)
        {
            if (string.IsNullOrEmpty(companyCode)) return _context.Branches.ToList();
            return _context.Branches.Where(b => b.CompanyCode == companyCode).ToList();
        }
        public List<DropdownValue> GetDropdowns(string category = null)
        {
            if (string.IsNullOrEmpty(category)) return _context.DropdownValues.ToList();
            return _context.DropdownValues.Where(d => d.Category == category).ToList();
        }

        // Mapping Helpers
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

        private static string BuildEmployeeDisplayName(Employee e)
        {
            var composed = $"{e.FirstName} {(string.IsNullOrEmpty(e.MiddleName) ? "" : e.MiddleName + " ")}{e.LastName}".Trim();
            if (!string.IsNullOrWhiteSpace(composed))
                return composed;
            return e.EmpCode ?? "";
        }
    }
}
