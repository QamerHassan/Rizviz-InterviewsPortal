using System;

namespace RizvizERP.API.Models
{
    public class NotificationModel
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Message { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public string TargetUser { get; set; } // e.g. username
        public string TargetInterviewName { get; set; } // e.g. "Arez Hassan"
        public string Type { get; set; } // e.g. "Edited", "Cancelled", "Rescheduled", "Added"
        public bool IsRead { get; set; } = false;

        // Detail fields for click modal popup
        public int? Sr { get; set; }
        public string IntervieweeName { get; set; }
        public string JobHunterName { get; set; }
        public string CompanyName { get; set; }
        public string ChangedField { get; set; }
        public string OldValue { get; set; }
        public string NewValue { get; set; }
    }
}
