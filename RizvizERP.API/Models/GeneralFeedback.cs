using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RizvizERP.API.Models
{
    [Table("GeneralFeedbacks")]
    public class GeneralFeedback
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [MaxLength(150)]
        public string Name { get; set; }

        [Required]
        [MaxLength(254)]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        [MaxLength(4000)]
        public string Message { get; set; }

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        /// <summary>Whether the row was successfully pushed to Google Sheets.</summary>
        public bool SheetSynced { get; set; } = false;

        /// <summary>ISO timestamp of the last successful sheet sync (nullable).</summary>
        public DateTime? SheetSyncedAt { get; set; }
    }
}
