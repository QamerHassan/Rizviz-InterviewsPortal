using System;
using System.ComponentModel.DataAnnotations;

namespace RizvizERP.API.DTOs
{
    // ── Inbound ─────────────────────────────────────────────────────────────────
    public class CreateFeedbackRequestDto
    {
        [Required(ErrorMessage = "Name is required.")]
        [MaxLength(150, ErrorMessage = "Name must be 150 characters or fewer.")]
        public string Name { get; set; }

        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress(ErrorMessage = "A valid email address is required.")]
        [MaxLength(254, ErrorMessage = "Email must be 254 characters or fewer.")]
        public string Email { get; set; }

        [Required(ErrorMessage = "Message is required.")]
        [MinLength(5, ErrorMessage = "Message must be at least 5 characters.")]
        [MaxLength(4000, ErrorMessage = "Message must be 4000 characters or fewer.")]
        public string Message { get; set; }
    }

    // ── Outbound ─────────────────────────────────────────────────────────────────
    public class FeedbackResponseDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public string Message { get; set; }
        public DateTime Timestamp { get; set; }
        public bool SheetSynced { get; set; }
        public string Status { get; set; }          // "success" | "partial"
        public string SheetMessage { get; set; }    // human-readable sheet result
    }
}
