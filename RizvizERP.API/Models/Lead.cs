using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RizvizERP.API.Models
{
    [Table("leads")]
    public class Lead
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [Column("company_name")]
        [StringLength(255)]
        public string CompanyName { get; set; }

        [Column("status")]
        [StringLength(100)]
        public string Status { get; set; }

        [Column("entertains")]
        [StringLength(500)]
        public string Entertains { get; set; }

        [Column("bd_closer")]
        [StringLength(500)]
        public string BdCloser { get; set; }

        [Column("is_converted")]
        public bool IsConverted { get; set; }

        [Column("rounds")]
        public int? Rounds { get; set; }

        [Column("last_activity", TypeName = "date")]
        public DateTime? LastActivity { get; set; }

        [Column("is_manual")]
        public bool IsManual { get; set; } = false;

        [Column("notes")]
        [StringLength(2000)]
        public string Notes { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
