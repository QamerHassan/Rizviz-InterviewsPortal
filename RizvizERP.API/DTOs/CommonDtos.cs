using System;
using System.Collections.Generic;

namespace RizvizERP.API.DTOs
{
    // Payroll DTOs
    public class PayrollProcessRequest
    {
        public int Year { get; set; }
        public int Month { get; set; }
        public string ProcessedBy { get; set; }
    }

    public class PayslipDto
    {
        public int EmployeeId { get; set; }
        public string EmpCode { get; set; }
        public string EmployeeName { get; set; }
        public string Department { get; set; }
        public string Designation { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        
        public decimal BasicSalary { get; set; }
        public decimal Allowances { get; set; }
        public decimal Deductions { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal LoanDeduction { get; set; }
        public decimal NetSalary { get; set; }
        
        public string PayMode { get; set; }
        public string BankName { get; set; }
        public string AccountNumber { get; set; }
        public string IBAN { get; set; }
    }

    // Asset DTOs
    public class AssetDto
    {
        public int Id { get; set; }
        public string AssetCode { get; set; }
        public string Name { get; set; }
        public string Category { get; set; }
        public string SerialNumber { get; set; }
        public DateTime PurchaseDate { get; set; }
        public decimal Value { get; set; }
        public string Status { get; set; }
        public string Remarks { get; set; }
        public string AssignedToEmployeeName { get; set; }
    }

    public class AssetAssignmentRequest
    {
        public int AssetId { get; set; }
        public int EmployeeId { get; set; }
        public DateTime AssignedDate { get; set; }
        public string Condition { get; set; }
    }

    // Project DTOs
    public class ProjectStatsDto
    {
        public int Total { get; set; }
        public int Active { get; set; }
        public int ResourceAllocations { get; set; }
        public int WithTeamMembers { get; set; }
    }

    public class ProjectDto
    {
        public int Id { get; set; }
        public string ProjectCode { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string Status { get; set; }
        public string ClientName { get; set; }
        public decimal Budget { get; set; }
        public List<ProjectMemberDto> Members { get; set; } = new List<ProjectMemberDto>();
    }

    public class ProjectMemberDto
    {
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; }
        public string RoleInProject { get; set; }
        public double AllocationPercentage { get; set; }
    }

    // Recruitment DTOs
    public class JobPostingDto
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Department { get; set; }
        public string Description { get; set; }
        public string Requirements { get; set; }
        public int OpeningsCount { get; set; }
        public string Status { get; set; }
        public DateTime PostedDate { get; set; }
        public DateTime? ClosingDate { get; set; }
    }

    public class CandidateDto
    {
        public int Id { get; set; }
        public int JobPostingId { get; set; }
        public string JobTitle { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public string Phone { get; set; }
        public string PipelineStatus { get; set; }
        public string ResumePath { get; set; }
        public DateTime AppliedDate { get; set; }
        public string ExperienceYears { get; set; }
        public string CurrentSalary { get; set; }
        public string ExpectedSalary { get; set; }
    }

    public class InterviewDto
    {
        public int Id { get; set; }
        public int CandidateId { get; set; }
        public string CandidateName { get; set; }
        public string JobTitle { get; set; }
        public DateTime ScheduleTime { get; set; }
        public string InterviewerName { get; set; }
        public string Round { get; set; }
        public string Status { get; set; }
        public string Feedback { get; set; }
        public string Rating { get; set; }
    }

    // Setup DTOs
    public class DropdownDto
    {
        public string Key { get; set; }
        public string Value { get; set; }
    }

    // Dashboard DTOs
    public class DashboardStatsDto
    {
        public int Headcount { get; set; }
        public int ActiveEmployees { get; set; }
        public int NewHiresThisMonth { get; set; }
        public int ResignedThisMonth { get; set; }
        
        public decimal TotalPayrollCost { get; set; }
        public decimal AverageSalary { get; set; }
        
        public int TotalAssets { get; set; }
        public int AssignedAssets { get; set; }
        
        public List<MonthlyPayrollStat> MonthlyPayrollHistory { get; set; } = new List<MonthlyPayrollStat>();
        public List<DepartmentDistribution> DepartmentDistribution { get; set; } = new List<DepartmentDistribution>();
        public List<AssetCategoryDistribution> AssetCategoryDistribution { get; set; } = new List<AssetCategoryDistribution>();
    }

    public class MonthlyPayrollStat
    {
        public string MonthName { get; set; }
        public decimal Cost { get; set; }
    }

    public class DepartmentDistribution
    {
        public string DepartmentName { get; set; }
        public int Count { get; set; }
    }

    public class AssetCategoryDistribution
    {
        public string Category { get; set; }
        public int Count { get; set; }
    }
}
