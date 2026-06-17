using System;

namespace RizvizERP.API.Models
{
    public class Project
    {
        public int Id { get; set; }
        public string ProjectCode { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string Status { get; set; } // In Progress, Completed, On Hold, Planned
        public string ClientName { get; set; }
        public decimal Budget { get; set; }
    }
}
