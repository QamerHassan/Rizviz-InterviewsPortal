using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RizvizERP.API.Data;
using RizvizERP.API.Models;
using RizvizERP.API.Services;

namespace RizvizERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Route("api/schedule-request")]
    public class ScheduleRequestController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly NotificationService _notificationService;
        private readonly IEmailService _emailService;
        private readonly ILogger<ScheduleRequestController> _logger;

        public ScheduleRequestController(
            ApplicationDbContext context,
            NotificationService notificationService,
            IEmailService emailService,
            ILogger<ScheduleRequestController> logger)
        {
            _context = context;
            _notificationService = notificationService;
            _emailService = emailService;
            _logger = logger;
        }

        public class CreateScheduleRequestDto
        {
            public string CandidateName { get; set; }
            public string CompanyName { get; set; }
            public DateTime RequestedDate { get; set; }
            public string TimeSlot { get; set; } // e.g. "02:00 PM - 03:00 PM"
            public string TimeZone { get; set; } = "PKT (UTC+5)";
            public string InterviewType { get; set; } = "1st Round";
            public string MeetingLink { get; set; }
            public string Notes { get; set; }
            public string RequestedBy { get; set; }
            public string DeveloperEmail { get; set; }
        }

        public class RespondScheduleRequestDto
        {
            public string Reason { get; set; }
            public string ProposedTimeSlot { get; set; }
            public DateTime? ProposedDate { get; set; }
            public string ProposedTimeZone { get; set; }
        }

        /// <summary>
        /// Get all schedule requests, filterable by candidate, status, or company.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetRequests(
            [FromQuery] string candidate = null,
            [FromQuery] string status = null,
            [FromQuery] string company = null)
        {
            try
            {
                var query = _context.ScheduleRequests.AsNoTracking().AsQueryable();

                if (!string.IsNullOrWhiteSpace(candidate))
                {
                    var candLower = candidate.Trim().ToLower();
                    query = query.Where(r => r.CandidateName.ToLower() == candLower);
                }

                if (!string.IsNullOrWhiteSpace(status))
                {
                    var statusLower = status.Trim().ToLower();
                    query = query.Where(r => r.Status.ToLower() == statusLower);
                }

                if (!string.IsNullOrWhiteSpace(company))
                {
                    var compLower = company.Trim().ToLower();
                    query = query.Where(r => r.CompanyName.ToLower() == compLower);
                }

                var list = await query
                    .OrderByDescending(r => r.CreatedAt)
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
                _logger.LogError(ex, "Error getting schedule requests");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Admin creates an interview schedule request for a candidate.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateRequest([FromBody] CreateScheduleRequestDto dto)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(dto.CandidateName))
                    return BadRequest(new { success = false, message = "Candidate Name is required." });

                if (string.IsNullOrWhiteSpace(dto.CompanyName))
                    return BadRequest(new { success = false, message = "Company Name is required." });

                var req = new ScheduleRequest
                {
                    CandidateName = dto.CandidateName.Trim(),
                    CompanyName = dto.CompanyName.Trim(),
                    RequestedDate = dto.RequestedDate.Date,
                    TimeSlot = dto.TimeSlot?.Trim(),
                    TimeZone = string.IsNullOrWhiteSpace(dto.TimeZone) ? "PKT (UTC+5)" : dto.TimeZone.Trim(),
                    InterviewType = string.IsNullOrWhiteSpace(dto.InterviewType) ? "1st Round" : dto.InterviewType.Trim(),
                    MeetingLink = dto.MeetingLink?.Trim(),
                    Notes = dto.Notes?.Trim(),
                    RequestedBy = dto.RequestedBy?.Trim() ?? "Admin",
                    Status = "Pending",
                    CreatedAt = DateTime.UtcNow
                };

                _context.ScheduleRequests.Add(req);
                await _context.SaveChangesAsync();

                // Send real-time SignalR notifications
                await _notificationService.NotifyScheduleRequestCreated(req);

                // Dispatch email (fire and forget / async)
                var devEmail = dto.DeveloperEmail;
                if (string.IsNullOrWhiteSpace(devEmail))
                {
                    // Look up developer email in Users table (matches candidate name with InterviewName or FullName)
                    var candNameLower = req.CandidateName.Trim().ToLower();
                    var devUser = await _context.Users.AsNoTracking()
                        .FirstOrDefaultAsync(u =>
                            (u.InterviewName != null && u.InterviewName.ToLower() == candNameLower) ||
                            (u.FullName != null && u.FullName.ToLower() == candNameLower) ||
                            (u.Username != null && u.Username.ToLower() == candNameLower));
                    devEmail = devUser?.Email;
                }

                if (!string.IsNullOrWhiteSpace(devEmail))
                {
                    try
                    {
                        _ = _emailService.SendInterviewRequestNotificationAsync(
                            req.CandidateName, devEmail, req.CompanyName, req.RequestedDate, req.TimeSlot, req.TimeZone, req.RequestedBy);
                    }
                    catch (Exception mailEx)
                    {
                        _logger.LogWarning(mailEx, "Email notification could not be dispatched: {Message}", mailEx.Message);
                    }
                }

                return Ok(new
                {
                    success = true,
                    message = $"Interview request sent to {req.CandidateName} for {req.CompanyName}.",
                    data = req
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating schedule request");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Developer accepts the interview request.
        /// Automatically creates confirmed interview record in database.
        /// </summary>
        [HttpPost("{id}/accept")]
        public async Task<IActionResult> AcceptRequest(int id)
        {
            try
            {
                var req = await _context.ScheduleRequests.FindAsync(id);
                if (req == null)
                    return NotFound(new { success = false, message = "Request not found." });

                if (req.Status == "Accepted")
                    return BadRequest(new { success = false, message = "Request is already accepted." });

                req.Status = "Accepted";
                req.RespondedAt = DateTime.UtcNow;

                // Create confirmed interview entry in database
                DateTime interviewDateTime = req.RequestedDate;
                if (!string.IsNullOrWhiteSpace(req.TimeSlot) && DateTime.TryParse(req.TimeSlot.Split('-')[0].Trim(), out var parsedTime))
                {
                    interviewDateTime = req.RequestedDate.Date.Add(parsedTime.TimeOfDay);
                }

                var interview = new Interview
                {
                    IntervieweeName = req.CandidateName,
                    CompanyName = req.CompanyName,
                    InterviewDate = interviewDateTime,
                    Status = "Scheduled",
                    InterviewType = req.InterviewType ?? "1st Round",
                    JobHunterName = req.RequestedBy,
                    InvTo = req.CandidateName,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Interviews.Add(interview);
                await _context.SaveChangesAsync();

                req.InterviewId = interview.Id;
                await _context.SaveChangesAsync();

                // Real-time broadcast to Admin
                await _notificationService.NotifyScheduleRequestResponded(req);

                // Admin email notification
                _ = _emailService.SendRequestResponseNotificationToAdminAsync(
                    "admin@rizvizerp.com", req.CandidateName, req.CompanyName, req.RequestedDate, "Accepted", null);

                return Ok(new
                {
                    success = true,
                    message = $"Interview accepted! Scheduled for {req.RequestedDate:yyyy-MM-dd}.",
                    data = req,
                    interviewId = interview.Id
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error accepting schedule request");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Developer rejects the interview request with a reason.
        /// Alerts Admin so they can pick another developer.
        /// </summary>
        [HttpPost("{id}/reject")]
        public async Task<IActionResult> RejectRequest(int id, [FromBody] RespondScheduleRequestDto dto)
        {
            try
            {
                var req = await _context.ScheduleRequests.FindAsync(id);
                if (req == null)
                    return NotFound(new { success = false, message = "Request not found." });

                req.Status = "Rejected";
                req.RejectionReason = string.IsNullOrWhiteSpace(dto?.Reason) ? "Developer is unavailable for this slot." : dto.Reason.Trim();
                req.RespondedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // Alert admin via SignalR
                await _notificationService.NotifyScheduleRequestResponded(req);

                // Admin email notification
                _ = _emailService.SendRequestResponseNotificationToAdminAsync(
                    "admin@rizvizerp.com", req.CandidateName, req.CompanyName, req.RequestedDate, "Rejected", req.RejectionReason);

                return Ok(new
                {
                    success = true,
                    message = $"Interview request rejected. Admin has been notified.",
                    data = req
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error rejecting schedule request");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Admin reschedules an interview request (changes date / timeslot / timezone).
        /// Updates the request status to "Rescheduled", updates linked Interview record if exists,
        /// and notifies developer via SignalR + Email.
        /// </summary>
        [HttpPost("{id}/reschedule")]
        public async Task<IActionResult> RescheduleRequest(int id, [FromBody] RespondScheduleRequestDto dto)
        {
            try
            {
                var req = await _context.ScheduleRequests.FindAsync(id);
                if (req == null)
                    return NotFound(new { success = false, message = "Request not found." });

                if (dto.ProposedDate.HasValue)
                {
                    req.RequestedDate = dto.ProposedDate.Value.Date;
                }
                if (!string.IsNullOrWhiteSpace(dto.ProposedTimeSlot))
                {
                    req.TimeSlot = dto.ProposedTimeSlot.Trim();
                }
                if (!string.IsNullOrWhiteSpace(dto.ProposedTimeZone))
                {
                    req.TimeZone = dto.ProposedTimeZone.Trim();
                }
                if (!string.IsNullOrWhiteSpace(dto.Reason))
                {
                    req.Notes = dto.Reason.Trim();
                }

                req.Status = "Rescheduled";
                req.RespondedAt = DateTime.UtcNow;

                // Update linked Interview record if it exists
                if (req.InterviewId.HasValue)
                {
                    var interview = await _context.Interviews.FindAsync(req.InterviewId.Value);
                    if (interview != null)
                    {
                        DateTime interviewDateTime = req.RequestedDate;
                        if (!string.IsNullOrWhiteSpace(req.TimeSlot) && DateTime.TryParse(req.TimeSlot.Split('-')[0].Trim(), out var parsedTime))
                        {
                            interviewDateTime = req.RequestedDate.Date.Add(parsedTime.TimeOfDay);
                        }
                        interview.InterviewDate = interviewDateTime;
                        interview.Status = "Rescheduled";
                    }
                }

                await _context.SaveChangesAsync();

                // Broadcast real-time SignalR notifications
                await _notificationService.NotifyScheduleRequestRescheduled(req);

                // Look up developer email
                var candNameLower = req.CandidateName.Trim().ToLower();
                var devUser = await _context.Users.AsNoTracking()
                    .FirstOrDefaultAsync(u =>
                        (u.InterviewName != null && u.InterviewName.ToLower() == candNameLower) ||
                        (u.FullName != null && u.FullName.ToLower() == candNameLower) ||
                        (u.Username != null && u.Username.ToLower() == candNameLower));
                var devEmail = devUser?.Email;

                if (!string.IsNullOrWhiteSpace(devEmail))
                {
                    try
                    {
                        _ = _emailService.SendRescheduleNotificationAsync(
                            devEmail, req.CandidateName, req.CompanyName, req.RequestedDate, req.TimeSlot, req.TimeZone, dto.Reason);
                    }
                    catch (Exception mailEx)
                    {
                        _logger.LogWarning(mailEx, "Email notification could not be dispatched: {Message}", mailEx.Message);
                    }
                }

                return Ok(new
                {
                    success = true,
                    message = $"Interview rescheduled for {req.RequestedDate:yyyy-MM-dd} ({req.TimeSlot}).",
                    data = req
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error rescheduling schedule request");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Delete/cancel a schedule request.
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRequest(int id)
        {
            try
            {
                var req = await _context.ScheduleRequests.FindAsync(id);
                if (req == null)
                    return NotFound(new { success = false, message = "Request not found." });

                _context.ScheduleRequests.Remove(req);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Request cancelled." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting schedule request");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
