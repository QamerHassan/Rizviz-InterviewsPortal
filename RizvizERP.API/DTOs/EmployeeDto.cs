using System;
using System.Collections.Generic;
using RizvizERP.API.Models;

namespace RizvizERP.API.DTOs
{
    public class EmployeeStatsDto
    {
        public int Total { get; set; }
        public int Active { get; set; }
        public int SuspendedLeave { get; set; }
        public int Terminated { get; set; }
    }

    public class EmployeeSummaryDto
    {
        public int Id { get; set; }
        public string EmpCode { get; set; }
        public string FullName { get; set; }
        public string Grade { get; set; }
        public string Type { get; set; }
        public string Status { get; set; }
        public string CNIC { get; set; }
        public string Gender { get; set; }
        public string ItOrNonIt { get; set; }
        public string Department { get; set; }
        public string Designation { get; set; }
        public DateTime? JoiningDate { get; set; }
        public decimal BasicSalary { get; set; }
    }

    public class EmployeeDetailDto
    {
        public int Id { get; set; }
        public string EmpCode { get; set; }
        public string CompanyCode { get; set; }
        public string BranchCode { get; set; }
        
        public string FirstName { get; set; }
        public string MiddleName { get; set; }
        public string LastName { get; set; }
        public string FatherName { get; set; }
        public string FullName { get; set; }
        
        public string Grade { get; set; }
        public string Type { get; set; }
        public string Status { get; set; }
        public string CNIC { get; set; }
        public string Gender { get; set; }
        
        public DateTime? DateOfBirth { get; set; }
        public DateTime? JoiningDate { get; set; }
        public DateTime? JobOfferDate { get; set; }
        public DateTime? FinalInterviewDate { get; set; }
        public DateTime? LeavingDate { get; set; }
        public DateTime? TerminationDate { get; set; }
        public DateTime? AnniversaryDate { get; set; }
        
        public string MaritalStatus { get; set; }
        public int Age { get; set; }
        
        public string NTN { get; set; }
        public string Nationality { get; set; }
        public string Religion { get; set; }
        public string IndividualOrCompany { get; set; }
        
        public DateTime? CNICValidity { get; set; }
        public string PassportNo { get; set; }
        public DateTime? PassportValidity { get; set; }
        public string LicenceNo { get; set; }
        public DateTime? LicenceValidity { get; set; }
        
        public string ReferredBy { get; set; }
        public string Remarks { get; set; }
        
        public string ItOrNonIt { get; set; }
        
        public bool Outsourced { get; set; }
        public bool Experienced { get; set; }
        public bool Certifications { get; set; }
        public bool MultipleRoles { get; set; }
        public bool External { get; set; }
        public bool Remote { get; set; }
        
        public decimal BasicSalary { get; set; }
        public decimal OnJobSalary { get; set; }
        public string Currency { get; set; }
        public string OnJobCurrency { get; set; }
        public string InvoiceTo { get; set; }
        
        public string PayMode { get; set; }
        public string PaymentCurrency { get; set; }

        public List<Address> Addresses { get; set; } = new List<Address>();
        public List<EmergencyContact> EmergencyContacts { get; set; } = new List<EmergencyContact>();
        public List<BloodRelation> BloodRelations { get; set; } = new List<BloodRelation>();
        public List<HealthData> HealthRecords { get; set; } = new List<HealthData>();
        public List<EmploymentHistory> EmploymentHistories { get; set; } = new List<EmploymentHistory>();
        public List<Education> EducationRecords { get; set; } = new List<Education>();
        public List<Document> Documents { get; set; } = new List<Document>();
        public List<HrLetter> HrLetters { get; set; } = new List<HrLetter>();
        public BankInfo BankInformation { get; set; }
        public string TermsAndConditions { get; set; }
        public List<DepartmentTeam> DepartmentTeams { get; set; } = new List<DepartmentTeam>();
        public List<EmployeeProject> Projects { get; set; } = new List<EmployeeProject>();
        public List<OtherIncome> OtherIncomes { get; set; } = new List<OtherIncome>();
        public List<LoanAdvance> LoansAdvances { get; set; } = new List<LoanAdvance>();
        public List<SalaryHistory> SalaryHistories { get; set; } = new List<SalaryHistory>();
        public List<LineManagerHistory> LineManagerHistories { get; set; } = new List<LineManagerHistory>();
        public List<FunctionalRoleHistory> FunctionalRoleHistories { get; set; } = new List<FunctionalRoleHistory>();
        public List<SalaryIncrement> SalaryIncrements { get; set; } = new List<SalaryIncrement>();
    }
}
