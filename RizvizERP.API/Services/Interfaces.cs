using System;
using System.Collections.Generic;
using RizvizERP.API.DTOs;
using RizvizERP.API.Models;

namespace RizvizERP.API.Services
{
    public interface IAuthService
    {
        LoginResponse Login(LoginRequest request);
        LoginResponse RefreshToken(TokenRefreshRequest request);
        void LogAction(string username, string action, string module, string ipAddress);
        List<AuditLog> GetAuditLogs();
    }

    public interface IEmployeeService
    {
        List<EmployeeSummaryDto> GetAll(string search = null, string branchCode = null, string status = null, string statusGroup = null);
        EmployeeStatsDto GetEmployeeStats();
        EmployeeDetailDto GetById(int id);
        EmployeeDetailDto Create(EmployeeDetailDto dto);
        EmployeeDetailDto Update(int id, EmployeeDetailDto dto);
        bool Delete(int id);
        List<SalaryHistory> GetSalaryHistory(int employeeId);
        List<Document> GetDocuments(int employeeId);
        Document SaveDocument(int employeeId, string docType, string fileName, string filePath);
    }

    public interface IPayrollService
    {
        List<PayrollDetail> GetMonthlyPayroll(int year, int month);
        List<PayrollDetail> ProcessPayroll(PayrollProcessRequest request);
        PayslipDto GetPayslip(int employeeId, int month, int year);
    }

    public interface IInventoryService
    {
        List<AssetDto> GetAllAssets(string category = null, string status = null);
        Asset CreateAsset(Asset asset);
        AssetAssignment AssignAsset(AssetAssignmentRequest request);
        bool ReturnAsset(int assetId, string condition);
    }

    public interface IProjectService
    {
        ProjectStatsDto GetProjectStats();
        List<ProjectDto> GetAllProjects(string metric = null, string search = null);
        ProjectDto CreateProject(Project project);
        bool AssignMember(int projectId, ProjectMemberDto memberDto);
    }

    public interface IRecruitmentService
    {
        List<JobPostingDto> GetJobs();
        JobPosting CreateJob(JobPosting job);
        List<CandidateDto> GetCandidates(int? jobId = null);
        Candidate UpdateCandidateStatus(int candidateId, string status);
        // List<InterviewDto> GetInterviews();
        // Interview ScheduleInterview(Interview interview);
        // Interview UpdateInterviewFeedback(int interviewId, string feedback, string rating);
    }

    public interface IDashboardService
    {
        DashboardStatsDto GetStats();
    }

    public interface ISetupService
    {
        List<Company> GetCompanies();
        List<Branch> GetBranches(string companyCode = null);
        List<DropdownValue> GetDropdowns(string category = null);
    }
}
