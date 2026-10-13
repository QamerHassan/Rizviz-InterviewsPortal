using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RizvizERP.API.Models
{
    [Table("Rizviz_DeveloperAvailability", Schema = "dbo")]
    public class DeveloperAvailability
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [Column("candidate_name")]
        [StringLength(150)]
        public string CandidateName { get; set; }

        [Required]
        [Column("availability_date")]
        public DateTime AvailabilityDate { get; set; }

        [Required]
        [Column("status")]
        [StringLength(50)]
        public string Status { get; set; } = "Unavailable"; // "Unavailable" | "Available" | "Emergency"

        [Column("reason_type")]
        [StringLength(100)]
        public string ReasonType { get; set; } // "Emergency", "Medical / Sickness", "Personal Leave", "Unavailable"

        [Column("timezone")]
        [StringLength(50)]
        public string TimeZone { get; set; } = "PKT (UTC+5)";

        [Column("start_time")]
        [StringLength(20)]
        public string StartTime { get; set; } // e.g. "14:00" or "02:00 PM"

        [Column("end_time")]
        [StringLength(20)]
        public string EndTime { get; set; } // e.g. "18:00" or "06:00 PM"

        [Column("notes")]
        [StringLength(500)]
        public string Notes { get; set; }

        [Column("created_by")]
        [StringLength(100)]
        public string CreatedBy { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }
    }
}
