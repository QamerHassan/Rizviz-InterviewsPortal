using System;

namespace RizvizERP.API.Models
{
    public class PayrollProcess
    {
        public int Id { get; set; }
        public int Year { get; set; }
        public int Month { get; set; }
        public DateTime ProcessedDate { get; set; }
        public string ProcessedBy { get; set; }
        public bool IsConfirmed { get; set; }
        public decimal TotalBasicSalary { get; set; }
        public decimal TotalAllowances { get; set; }
        public decimal TotalDeductions { get; set; }
        public decimal TotalNetSalary { get; set; }
    }

    public class PayrollDetail
    {
        public int Id { get; set; }
        public int PayrollProcessId { get; set; }
        public int EmployeeId { get; set; }
        public string EmpCode { get; set; }
        public string EmployeeName { get; set; }
        public string Department { get; set; }
        public string Designation { get; set; }
        
        public decimal BasicSalary { get; set; }
        public decimal Allowances { get; set; } // Detailed allowances sum
        public decimal Deductions { get; set; } // Detailed deductions sum
        public decimal TaxAmount { get; set; }
        public decimal LoanDeduction { get; set; }
        public decimal NetSalary { get; set; }
        
        public string PayMode { get; set; }
        public string BankName { get; set; }
        public string AccountNumber { get; set; }
        
        public bool IsPaid { get; set; }
        public DateTime? PaidDate { get; set; }
    }
}
