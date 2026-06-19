using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RizvizERP.API.Models
{
    [Table("interview_feedback")]
    public class InterviewFeedback
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        /// <summary>Sr number from Excel — unique per interview. Used for deduplication.</summary>
        [Column("sr")]
        public int? Sr { get; set; }

        [Column("interviewer_name")]
        [StringLength(255)]
        public string InterviewerName { get; set; }

        [Column("interviewee_name")]
        [StringLength(255)]
        public string IntervieweeName { get; set; }

        [Column("company_name")]
        [StringLength(255)]
        public string CompanyName { get; set; }

        [Column("interview_type")]
        [StringLength(100)]
        public string InterviewType { get; set; }

        [Column("interview_date", TypeName = "date")]
        public DateTime? InterviewDate { get; set; }

        [Column("audio_file_url")]
        [StringLength(500)]
        public string AudioFileUrl { get; set; }

        [Column("urdu_transcript")]
        public string UrduTranscript { get; set; }

        [Column("english_feedback")]
        public string EnglishFeedback { get; set; }

        [Column("communication")]
        public string Communication { get; set; }

        [Column("technical_skills")]
        public string TechnicalSkills { get; set; }

        [Column("strengths")]
        public string Strengths { get; set; }

        [Column("weaknesses")]
        public string Weaknesses { get; set; }

        [Column("recommendation")]
        [StringLength(50)]
        public string Recommendation { get; set; }

        [Column("rating")]
        public int Rating { get; set; }

        [Column("feedback_by")]
        [StringLength(255)]
        public string FeedbackBy { get; set; }

        [Column("feedback_date")]
        [StringLength(50)]
        public string FeedbackDate { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // ── Interview metadata stored at feedback-save time ──────────────────
        // These fields mirror the matching Interview row so GET /api/feedback
        // can display Status, InvTo, etc. even when the Excel file is not
        // present on the production server (Railway).

        [Column("status")]
        [StringLength(100)]
        public string Status { get; set; }

        [Column("inv_to")]
        [StringLength(100)]
        public string InvTo { get; set; }

        [Column("interview_for")]
        [StringLength(500)]
        public string InterviewFor { get; set; }

        [Column("job_start_date", TypeName = "date")]
        public DateTime? JobStartDate { get; set; }

        [Column("job_close_date", TypeName = "date")]
        public DateTime? JobCloseDate { get; set; }
    }
}
