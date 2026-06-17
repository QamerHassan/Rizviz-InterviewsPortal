using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RizvizERP.API.Models
{
    [Table("Rizviz_InterviewHistory", Schema = "dbo")]
    public class InterviewHistory
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("interview_id")]
        public int InterviewId { get; set; }

        [Column("interview_code")]
        [StringLength(100)]
        public string InterviewCode { get; set; }

        [Column("old_status")]
        [StringLength(50)]
        public string OldStatus { get; set; }

        [Column("new_status")]
        [StringLength(50)]
        public string NewStatus { get; set; }

        [Column("old_recruiter")]
        [StringLength(255)]
        public string OldRecruiter { get; set; }

        [Column("new_recruiter")]
        [StringLength(255)]
        public string NewRecruiter { get; set; }

        [Column("old_interview_date")]
        public DateTime? OldInterviewDate { get; set; }

        [Column("new_interview_date")]
        public DateTime? NewInterviewDate { get; set; }

        [Column("changed_by")]
        [StringLength(100)]
        public string ChangedBy { get; set; } = "ExcelSync";

        [Column("changed_at")]
        public DateTime ChangedAt { get; set; } = DateTime.UtcNow;

        [Column("change_summary")]
        [StringLength(500)]
        public string ChangeSummary { get; set; }
    }

    [Table("Rizviz_InterviewSyncLog", Schema = "dbo")]
    public class InterviewSyncLog
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("synced_at")]
        public DateTime SyncedAt { get; set; } = DateTime.UtcNow;

        [Column("source_path")]
        [StringLength(500)]
        public string SourcePath { get; set; }

        [Column("total_rows")]
        public int TotalRows { get; set; }

        [Column("inserted_rows")]
        public int InsertedRows { get; set; }

        [Column("updated_rows")]
        public int UpdatedRows { get; set; }

        [Column("unchanged_rows")]
        public int UnchangedRows { get; set; }

        [Column("failed_rows")]
        public int FailedRows { get; set; }

        [Column("error_message")]
        public string ErrorMessage { get; set; }
    }
}
