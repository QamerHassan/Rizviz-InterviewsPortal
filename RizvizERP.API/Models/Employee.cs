using System;
using System.Collections.Generic;

namespace RizvizERP.API.Models
{
    public class Employee
    {
        public int Id { get; set; }
        public string EmpCode { get; set; }
        public string CompanyCode { get; set; }
        public string BranchCode { get; set; }
        
        // Basic Info
        public string FirstName { get; set; }
        public string MiddleName { get; set; }
        public string LastName { get; set; }
        public string FatherName { get; set; }
        public string FullName => $"{FirstName} {(string.IsNullOrEmpty(MiddleName) ? "" : MiddleName + " ")}{LastName}".Trim();
        
        public string Grade { get; set; }
        public string Type { get; set; } // e.g., Contract, Permanent
        public string Status { get; set; } // e.g., Active, Suspended, Resigned
        public string CNIC { get; set; } // Format: 00000-0000000-0
        public string Gender { get; set; }
        
        public DateTime? DateOfBirth { get; set; }
        public DateTime? JoiningDate { get; set; }
        public DateTime? JobOfferDate { get; set; }
        public DateTime? FinalInterviewDate { get; set; }
        public DateTime? LeavingDate { get; set; }
        public DateTime? TerminationDate { get; set; }
        public DateTime? AnniversaryDate { get; set; }
        
        public string MaritalStatus { get; set; }
        public int Age => DateOfBirth.HasValue ? DateTime.Today.Year - DateOfBirth.Value.Year - (DateTime.Today.DayOfYear < DateOfBirth.Value.DayOfYear ? 1 : 0) : 0;
        
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
        
        public string ItOrNonIt { get; set; } // IT or Non-IT
        
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
        
        public string PayMode { get; set; } // Bank, Cash, Cheque
        public string PaymentCurrency { get; set; }

        // Navigation properties for the Tabs
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

    public class Address
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string Type { get; set; } // Home, Office, Permanent
        public string StreetAddress { get; set; }
        public string City { get; set; }
        public string Country { get; set; }
        public string Phone { get; set; }
    }

    public class EmergencyContact
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string Name { get; set; }
        public string Relation { get; set; }
        public string Phone { get; set; }
    }

    public class BloodRelation
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string Name { get; set; }
        public string Relation { get; set; }
        public string CNIC { get; set; }
        public string ContactNo { get; set; }
    }

    public class HealthData
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string BloodGroup { get; set; }
        public string MedicalConditions { get; set; }
        public string Allergies { get; set; }
        public string EmergencyInstructions { get; set; }
    }

    public class EmploymentHistory
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string CompanyName { get; set; }
        public string Designation { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public decimal LastSalary { get; set; }
        public string ReasonForLeaving { get; set; }
    }

    public class Education
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string Degree { get; set; }
        public string Institution { get; set; }
        public int PassingYear { get; set; }
        public string GradeOrGpa { get; set; }
    }

    public class Document
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string DocumentType { get; set; } // CNIC, Passport, Certificate, Degree
        public string DocumentName { get; set; }
        public string FilePath { get; set; }
        public DateTime? UploadedAt { get; set; }
    }

    public class HrLetter
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string LetterType { get; set; } // Offer Letter, Experience Letter, Increment Letter
        public DateTime? IssueDate { get; set; }
        public string Content { get; set; }
    }

    public class BankInfo
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string BankName { get; set; }
        public string AccountNumber { get; set; }
        public string IBAN { get; set; }
        public string BranchCode { get; set; }
    }

    public class DepartmentTeam
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string Department { get; set; }
        public string Team { get; set; }
        public string Stack { get; set; } // e.g. .NET Core, React
        public string Module { get; set; } // e.g. HR, Payroll
        public string Type { get; set; } // Primary, Secondary
    }

    public class EmployeeProject
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string ProjectName { get; set; }
        public string RoleInProject { get; set; }
        public DateTime? AssignedDate { get; set; }
        public DateTime? ReleasedDate { get; set; }
        public double AllocationPercentage { get; set; }
    }

    public class OtherIncome
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string IncomeType { get; set; } // e.g. Bonus, Commission, Fuel Allowance
        public decimal Amount { get; set; }
        public DateTime? EffectiveDate { get; set; }
        public string Description { get; set; }
    }

    public class LoanAdvance
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string Type { get; set; } // Loan, Advance
        public decimal Amount { get; set; }
        public decimal RepaidAmount { get; set; }
        public decimal MonthlyDeduction { get; set; }
        public DateTime? DisbursedDate { get; set; }
        public string Status { get; set; } // Active, Paid
    }

    public class SalaryHistory
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public DateTime? EffectiveDate { get; set; }
        public decimal BasicSalary { get; set; }
        public decimal OnJobSalary { get; set; }
        public string Currency { get; set; }
        public string Reason { get; set; }
    }

    public class LineManagerHistory
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string LineManagerName { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public string IsPrimary { get; set; } // Yes, No
    }

    public class FunctionalRoleHistory
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public string FunctionalRole { get; set; }
        public string FunctionalTitle { get; set; }
        public string LineManager { get; set; }
        public DateTime? EffectiveDate { get; set; }
    }

    public class SalaryIncrement
    {
        public int Id { get; set; }
        public int EmployeeId { get; set; }
        public DateTime? IncrementDate { get; set; }
        public decimal IncrementAmount { get; set; }
        public string Percentage { get; set; }
        public string ApprovedBy { get; set; }
    }
}
