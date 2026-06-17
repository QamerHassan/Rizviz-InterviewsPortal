using System;

namespace RizvizERP.API.Models
{
    public class Branch
    {
        public int Id { get; set; }
        public string BranchCode { get; set; }
        public string Name { get; set; }
        public string CompanyCode { get; set; }
        public string City { get; set; }
        public string Address { get; set; }
        public bool IsActive { get; set; }
    }

    public class Company
    {
        public int Id { get; set; }
        public string CompanyCode { get; set; }
        public string Name { get; set; }
        public string TaxId { get; set; }
        public string Address { get; set; }
        public string Phone { get; set; }
        public bool IsActive { get; set; }
    }

    public class DropdownValue
    {
        public int Id { get; set; }
        public string Category { get; set; } // Grade, EmployeeType, Status, Religion, Currency, Stack, etc.
        public string Key { get; set; }
        public string Value { get; set; }
        public int DisplayOrder { get; set; }
    }
}
