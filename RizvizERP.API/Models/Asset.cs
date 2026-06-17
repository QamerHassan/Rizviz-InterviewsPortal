using System;

namespace RizvizERP.API.Models
{
    public class Asset
    {
        public int Id { get; set; }
        public string AssetCode { get; set; }
        public string Name { get; set; }
        public string Category { get; set; } // Laptop, SIM, Mobile, Table, Chair
        public string SerialNumber { get; set; }
        public DateTime PurchaseDate { get; set; }
        public decimal Value { get; set; }
        public string Status { get; set; } // Available, Assigned, Under Maintenance, Scrapped
        public string Remarks { get; set; }
    }

    public class AssetAssignment
    {
        public int Id { get; set; }
        public int AssetId { get; set; }
        public string AssetCode { get; set; }
        public string AssetName { get; set; }
        public int EmployeeId { get; set; }
        public string EmployeeName { get; set; }
        public DateTime AssignedDate { get; set; }
        public DateTime? ReturnedDate { get; set; }
        public string Condition { get; set; }
        public string Status { get; set; } // Active, Returned
    }
}
