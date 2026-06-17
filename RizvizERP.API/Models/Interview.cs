using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace RizvizERP.API.Models
{
    public class JobPosting
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Department { get; set; }
        public string Description { get; set; }
        public string Requirements { get; set; }
        public int OpeningsCount { get; set; }
        public string Status { get; set; } // Active, Closed, Draft
        public DateTime PostedDate { get; set; }
        public DateTime? ClosingDate { get; set; }
    }

    public class Candidate
    {
        public int Id { get; set; }
        public int JobPostingId { get; set; }
        public string JobTitle { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public string Phone { get; set; }
        public string PipelineStatus { get; set; } // Applied, Screening, Interview, Offer, Hired, Rejected
        public string ResumePath { get; set; }
        public DateTime AppliedDate { get; set; }
        public string ExperienceYears { get; set; }
        public string CurrentSalary { get; set; }
        public string ExpectedSalary { get; set; }
    }

    public class Interview
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Column("sr")]
        public int? Sr { get; set; }

        [Column("inv_to")]
        [StringLength(100)]
        public string InvTo { get; set; }

        [Column("interview_date", TypeName = "date")]
        public DateTime? InterviewDate { get; set; }

        [Column("interview_for")]
        [StringLength(255)]
        public string InterviewFor { get; set; }

        [Column("interviewee_name")]
        [StringLength(255)]
        public string IntervieweeName { get; set; }

        [Column("job_hunter_name")]
        [StringLength(255)]
        public string JobHunterName { get; set; }

        [Column("company_name")]
        [StringLength(255)]
        public string CompanyName { get; set; }

        [Column("interview_type")]
        [StringLength(100)]
        public string InterviewType { get; set; }

        [Column("job_start_date", TypeName = "date")]
        public DateTime? JobStartDate { get; set; }

        [Column("job_close_date", TypeName = "date")]
        public DateTime? JobCloseDate { get; set; }

        [Column("first_salary")]
        [StringLength(50)]
        public string FirstSalary { get; set; }

        [Column("jh_suggest")]
        [StringLength(255)]
        public string JhSuggest { get; set; }

        [Column("interview_charges", TypeName = "decimal(12,2)")]
        public decimal InterviewCharges { get; set; } = 0;

        [Column("jh_due", TypeName = "decimal(12,2)")]
        public decimal JhDue { get; set; } = 0;

        [Column("first_payment_on_job", TypeName = "decimal(12,2)")]
        public decimal FirstPaymentOnJob { get; set; } = 0;

        [Column("second_payment_on_job", TypeName = "decimal(12,2)")]
        public decimal SecondPaymentOnJob { get; set; } = 0;

        [Column("balance_payable", TypeName = "decimal(12,2)")]
        public decimal BalancePayable { get; set; } = 0;

        [Column("interview_code")]
        [StringLength(100)]
        public string InterviewCode { get; set; }

        [Column("status")]
        [StringLength(50)]
        public string Status { get; set; } = "Scheduled";

        [Column("stack")]
        [StringLength(50)]
        public string Stack { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [Column("last_synced_at")]
        public DateTime? LastSyncedAt { get; set; }

        /// <summary>Full Excel/CSV row as JSON (original column headers preserved).</summary>
        [Column("raw_row_json")]
        public string RawRowJson { get; set; }
    }
}
