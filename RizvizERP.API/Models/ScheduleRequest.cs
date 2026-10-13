using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RizvizERP.API.Models
{
    [Table("Rizviz_ScheduleRequests", Schema = "dbo")]
    public class ScheduleRequest
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [Column("candidate_name")]
        [StringLength(150)]
        public string CandidateName { get; set; }

        [Required]
        [Column("company_name")]
        [StringLength(150)]
        public string CompanyName { get; set; }

        [Required]
        [Column("requested_date")]
        public DateTime RequestedDate { get; set; }

        [Column("time_slot")]
        [StringLength(100)]
        public string TimeSlot { get; set; } // e.g. "03:00 PM - 04:00 PM"

        [Column("timezone")]
        [StringLength(50)]
        public string TimeZone { get; set; } = "PKT (UTC+5)";

        [Column("interview_type")]
        [StringLength(100)]
        public string InterviewType { get; set; } = "1st Round";

        [Column("meeting_link")]
        [StringLength(500)]
        public string MeetingLink { get; set; }

        [Required]
        [Column("status")]
        [StringLength(50)]
        public string Status { get; set; } = "Pending"; // "Pending", "Accepted", "Rejected", "Rescheduled"

        [Column("notes")]
        [StringLength(1000)]
        public string Notes { get; set; }

        [Column("requested_by")]
        [StringLength(100)]
        public string RequestedBy { get; set; }

        [Column("rejection_reason")]
        [StringLength(500)]
        public string RejectionReason { get; set; }

        [Column("interview_id")]
        public int? InterviewId { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("responded_at")]
        public DateTime? RespondedAt { get; set; }
    }
}
