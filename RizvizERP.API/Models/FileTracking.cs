using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RizvizERP.API.Models
{
    [Table("Rizviz_FileTracking", Schema = "dbo")]
    public class FileTracking
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("file_name")]
        [StringLength(255)]
        public string FileName { get; set; }

        [Column("last_uploaded_hash")]
        [StringLength(100)]
        public string LastUploadedHash { get; set; }

        [Column("last_uploaded_at")]
        public DateTime LastUploadedAt { get; set; } = DateTime.UtcNow;

        [Column("last_uploaded_by")]
        [StringLength(100)]
        public string LastUploadedBy { get; set; }
    }
}
