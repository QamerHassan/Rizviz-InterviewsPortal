using System;
using System.Collections.Generic;

namespace RizvizERP.API.Models
{
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string PasswordHash { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public string RoleName { get; set; } // Admin, HR, Manager, Employee
        public string InterviewName { get; set; }
        public string CompanyCode { get; set; }
        public string BranchCode { get; set; }
        public bool IsActive { get; set; }
        public bool IsFirstLogin { get; set; } = true;
    }

    public class Role
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public List<string> Permissions { get; set; } = new List<string>();
    }

    public class AuditLog
    {
        public int Id { get; set; }
        public string Username { get; set; }
        public string Action { get; set; }
        public string Module { get; set; }
        public DateTime Timestamp { get; set; }
        public string IpAddress { get; set; }
    }
}
