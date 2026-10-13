using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RizvizERP.API.Data;
using RizvizERP.API.Hubs;
using RizvizERP.API.Models;
using RizvizERP.API.Services;

namespace RizvizERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Route("api/developer-availability")]
    public class DeveloperAvailabilityController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<DeveloperAvailabilityController> _logger;
        private readonly NotificationService _notificationService;
        private readonly IHubContext<NotificationHub> _hubContext;

        public DeveloperAvailabilityController(
            ApplicationDbContext context,
            ILogger<DeveloperAvailabilityController> logger,
            NotificationService notificationService,
            IHubContext<NotificationHub> hubContext)
        {
            _context = context;
            _logger = logger;
            _notificationService = notificationService;
            _hubContext = hubContext;
        }

        public class SaveAvailabilityDto
        {
            public int? Id { get; set; }
            public string CandidateName { get; set; }
            public DateTime AvailabilityDate { get; set; }
            public string Status { get; set; } = "Unavailable"; // "Unavailable", "Available", "Emergency"
            public string ReasonType { get; set; } // "Emergency", "Medical", "Leave", "Personal", etc.
            public string TimeZone { get; set; } = "PKT (UTC+5)";
            public string StartTime { get; set; } // e.g. "14:00"
            public string EndTime { get; set; } // e.g. "18:00"
            public string Notes { get; set; }
        }

        /// <summary>
        /// Get developer unavailability declarations.
        /// Filterable by candidate name, date range, or month.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAvailabilities(
            [FromQuery] string candidate = null,
            [FromQuery] DateTime? from = null,
            [FromQuery] DateTime? to = null,
            [FromQuery] string month = null)
        {
            try
            {
                var query = _context.DeveloperAvailabilities.AsNoTracking().AsQueryable();

                if (!string.IsNullOrWhiteSpace(candidate))
                {
                    var candLower = candidate.Trim().ToLower();
                    query = query.Where(a => a.CandidateName.ToLower() == candLower);
                }

                if (from.HasValue)
                {
                    var fDate = from.Value.Date;
                    query = query.Where(a => a.AvailabilityDate >= fDate);
                }

                if (to.HasValue)
                {
                    var tDate = to.Value.Date;
                    query = query.Where(a => a.AvailabilityDate <= tDate);
                }

                if (!string.IsNullOrWhiteSpace(month) && DateTime.TryParse($"{month}-01", out var mStart))
                {
                    var mEnd = mStart.AddMonths(1).AddDays(-1);
                    query = query.Where(a => a.AvailabilityDate >= mStart && a.AvailabilityDate <= mEnd);
                }

                var list = await query
                    .OrderBy(a => a.AvailabilityDate)
                    .ThenBy(a => a.CandidateName)
                    .ToListAsync();

                return Ok(new
                {
                    success = true,
                    count = list.Count,
                    data = list
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting developer availabilities");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Create or update a developer availability / unavailability declaration.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SaveAvailability([FromBody] SaveAvailabilityDto dto)
        {
            if (dto == null)
                return BadRequest(new { success = false, message = "Payload cannot be empty." });

            if (string.IsNullOrWhiteSpace(dto.CandidateName))
                return BadRequest(new { success = false, message = "Candidate / Developer name is required." });

            try
            {
                var candName = dto.CandidateName.Trim();
                var candLower = candName.ToLower();
                var targetDate = dto.AvailabilityDate.Date;
                var currentUserName = User?.Identity?.Name ?? candName;

                // Check if existing record exists for this developer on this date
                DeveloperAvailability existing = null;
                if (dto.Id.HasValue && dto.Id.Value > 0)
                {
                    existing = await _context.DeveloperAvailabilities.FirstOrDefaultAsync(a => a.Id == dto.Id.Value);
                }

                if (existing == null)
                {
                    existing = await _context.DeveloperAvailabilities
                        .FirstOrDefaultAsync(a => a.CandidateName.ToLower() == candLower && a.AvailabilityDate.Date == targetDate);
                }

                // If status is marked "Available" (not "FreeSlot"), we clear any existing unavailability record.
                if (string.Equals(dto.Status, "Available", StringComparison.OrdinalIgnoreCase))
                {
                    if (existing != null)
                    {
                        _context.DeveloperAvailabilities.Remove(existing);
                        await _context.SaveChangesAsync();
                        return Ok(new
                        {
                            success = true,
                            message = $"Marked as Available. Unavailability record removed for {candName} on {targetDate:yyyy-MM-dd}.",
                            deleted = true
                        });
                    }

                    return Ok(new
                    {
                        success = true,
                        message = $"{candName} is already Available on {targetDate:yyyy-MM-dd}."
                    });
                }

                // "FreeSlot" status — always insert a new slot record (multiple allowed per date)
                if (string.Equals(dto.Status, "FreeSlot", StringComparison.OrdinalIgnoreCase))
                {
                    var slotRecord = new DeveloperAvailability
                    {
                        CandidateName = candName,
                        AvailabilityDate = targetDate,
                        Status = "Available", // store as Available in DB
                        ReasonType = "Available",
                        TimeZone = string.IsNullOrWhiteSpace(dto.TimeZone) ? "PKT (UTC+5)" : dto.TimeZone.Trim(),
                        StartTime = dto.StartTime?.Trim(),
                        EndTime = dto.EndTime?.Trim(),
                        Notes = dto.Notes?.Trim(),
                        CreatedBy = currentUserName,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.DeveloperAvailabilities.Add(slotRecord);
                    await _context.SaveChangesAsync();

                    return Ok(new
                    {
                        success = true,
                        message = $"Free slot {dto.StartTime}–{dto.EndTime} ({dto.TimeZone}) declared for {candName} on {targetDate:yyyy-MM-dd}.",
                        data = slotRecord
                    });
                }

                var statusVal = string.IsNullOrWhiteSpace(dto.Status) ? "Unavailable" : dto.Status.Trim();
                var reasonVal = string.IsNullOrWhiteSpace(dto.ReasonType) ? "Unavailable" : dto.ReasonType.Trim();

                var tzVal = string.IsNullOrWhiteSpace(dto.TimeZone) ? "PKT (UTC+5)" : dto.TimeZone.Trim();

                if (existing != null)
                {
                    existing.Status = statusVal;
                    existing.ReasonType = reasonVal;
                    existing.TimeZone = tzVal;
                    existing.StartTime = dto.StartTime?.Trim();
                    existing.EndTime = dto.EndTime?.Trim();
                    existing.Notes = dto.Notes?.Trim();
                    existing.UpdatedAt = DateTime.UtcNow;
                    existing.CreatedBy = currentUserName;
                    _context.DeveloperAvailabilities.Update(existing);
                    await _context.SaveChangesAsync();

                    // 🔔 Notify Admins via SignalR — updated unavailability
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            string dateStr = targetDate.ToString("dddd, MMM d yyyy");
                            bool hasTime = !string.IsNullOrWhiteSpace(dto.StartTime) && !string.IsNullOrWhiteSpace(dto.EndTime);
                            string timeRange = hasTime ? $" ({dto.StartTime} – {dto.EndTime})" : " (All Day)";
                            var adminPayload = new
                            {
                                Id = Guid.NewGuid().ToString(),
                                Timestamp = DateTime.UtcNow,
                                Type = "UnavailabilityMarked",
                                IsRead = false,
                                IntervieweeName = candName,
                                TargetInterviewName = candName,
                                Message = $"🟠 {candName} updated unavailability on {dateStr}{timeRange}. Reason: {reasonVal}",
                                CompanyName = "",
                                ChangedField = "Availability",
                                OldValue = hasTime ? $"{dto.StartTime} – {dto.EndTime}" : "All Day",
                                NewValue = reasonVal,
                                // Extra fields for detail modal
                                StartTime = dto.StartTime ?? "",
                                EndTime = dto.EndTime ?? "",
                                AvailabilityDate = targetDate.ToString("dddd, MMMM d, yyyy"),
                                TimeZone = tzVal,
                                Notes = dto.Notes ?? ""
                            };
                            await _hubContext.Clients.Group("Admins").SendAsync("ReceiveNotification", adminPayload);
                            await _hubContext.Clients.All.SendAsync("DevAvailabilityChanged", new { candidate = candName, date = targetDate.ToString("yyyy-MM-dd"), reason = reasonVal });
                            Console.WriteLine($"[DevAvailability] 📤 SignalR UnavailabilityMarked (update) sent to Admins for {candName}");
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"[DevAvailability] SignalR notification failed: {ex.Message}");
                        }
                    });

                    return Ok(new
                    {
                        success = true,
                        message = $"Availability updated for {candName} on {targetDate:yyyy-MM-dd}.",
                        data = existing
                    });
                }
                else
                {
                    var newRecord = new DeveloperAvailability
                    {
                        CandidateName = candName,
                        AvailabilityDate = targetDate,
                        Status = statusVal,
                        ReasonType = reasonVal,
                        TimeZone = tzVal,
                        StartTime = dto.StartTime?.Trim(),
                        EndTime = dto.EndTime?.Trim(),
                        Notes = dto.Notes?.Trim(),
                        CreatedBy = currentUserName,
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.DeveloperAvailabilities.Add(newRecord);
                    await _context.SaveChangesAsync();

                    // 🔔 Notify Admins via SignalR — new unavailability marked
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            string dateStr = targetDate.ToString("dddd, MMM d yyyy");
                            bool hasTime = !string.IsNullOrWhiteSpace(dto.StartTime) && !string.IsNullOrWhiteSpace(dto.EndTime);
                            string timeRange = hasTime ? $" ({dto.StartTime} – {dto.EndTime})" : " (All Day)";
                            var adminPayload = new
                            {
                                Id = Guid.NewGuid().ToString(),
                                Timestamp = DateTime.UtcNow,
                                Type = "UnavailabilityMarked",
                                IsRead = false,
                                IntervieweeName = candName,
                                TargetInterviewName = candName,
                                Message = $"🟠 {candName} marked as Unavailable on {dateStr}{timeRange}. Reason: {reasonVal}",
                                CompanyName = "",
                                ChangedField = "Availability",
                                OldValue = hasTime ? $"{dto.StartTime} – {dto.EndTime}" : "All Day",
                                NewValue = reasonVal,
                                // Extra fields for detail modal
                                StartTime = dto.StartTime ?? "",
                                EndTime = dto.EndTime ?? "",
                                AvailabilityDate = targetDate.ToString("dddd, MMMM d, yyyy"),
                                TimeZone = tzVal,
                                Notes = dto.Notes ?? ""
                            };
                            await _hubContext.Clients.Group("Admins").SendAsync("ReceiveNotification", adminPayload);
                            await _hubContext.Clients.All.SendAsync("DevAvailabilityChanged", new { candidate = candName, date = targetDate.ToString("yyyy-MM-dd"), reason = reasonVal });
                            Console.WriteLine($"[DevAvailability] 📤 SignalR UnavailabilityMarked sent to Admins for {candName}");
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"[DevAvailability] SignalR notification failed: {ex.Message}");
                        }
                    });

                    return Ok(new
                    {
                        success = true,
                        message = $"Marked as {statusVal} ({reasonVal}) for {candName} on {targetDate:yyyy-MM-dd}.",
                        data = newRecord
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving developer availability");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Remove an unavailability entry (making the developer available again).
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAvailability(int id)
        {
            try
            {
                var record = await _context.DeveloperAvailabilities.FindAsync(id);
                if (record == null)
                    return NotFound(new { success = false, message = "Record not found." });

                _context.DeveloperAvailabilities.Remove(record);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = $"Removed unavailability record. Developer is now Available on {record.AvailabilityDate:yyyy-MM-dd}."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting developer availability");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
