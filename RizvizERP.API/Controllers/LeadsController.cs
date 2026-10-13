using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RizvizERP.API.Models;
using RizvizERP.API.Data;
using RizvizERP.API.Services;

namespace RizvizERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LeadsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public LeadsController(ApplicationDbContext context)
        {
            _context = context;
        }

        private User GetCurrentUser()
        {
            try
            {
                var authHeader = Request.Headers["Authorization"].ToString();
                var username = AuthHelper.GetUsernameFromToken(authHeader);
                if (!string.IsNullOrEmpty(username))
                {
                    var user = AuthHelper.GetUserByUsername(username);
                    if (user != null) return user;
                    var dbUser = _context.Users.AsNoTracking().FirstOrDefault(u => u.Username == username);
                    if (dbUser != null) return dbUser;
                    return new User { Username = username, RoleName = "User" };
                }
            }
            catch {}
            return new User { Username = "User", RoleName = "User" };
        }

        private bool CanEdit(User user)
        {
            if (user == null) return false;
            var role = user.RoleName;
            return string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(role, "HR", StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(role, "Manager", StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(role, "Employee", StringComparison.OrdinalIgnoreCase);
        }

        private IQueryable<Interview> GetUserInterviewsQuery(User user, string intervieweeParam = null)
        {
            if (user == null)
                return new List<Interview>().AsQueryable().Where(i => false);

            var authHeader = Request.Headers["Authorization"].ToString();
            var sessionId = AuthHelper.GetSessionIdFromToken(authHeader);
            var state = SessionExcelManager.GetState(sessionId);

            bool isStale = state != null
                && state.HasUploaded
                && !state.IsBypassed
                && state.UploadedFileDate.HasValue
                && state.UploadedFileDate.Value.Date != DateTime.Today;

            bool hasActiveSession = state != null && state.HasUploaded && !isStale;

            IQueryable<Interview> query;
            if (hasActiveSession && state.Interviews.Count > 0)
            {
                query = state.Interviews.AsQueryable();
            }
            else
            {
                query = _context.Interviews.AsNoTracking();
            }

            bool isAdmin = string.Equals(user.RoleName, "Admin", StringComparison.OrdinalIgnoreCase) ||
                           string.Equals(user.RoleName, "HR", StringComparison.OrdinalIgnoreCase) ||
                           string.Equals(user.RoleName, "Manager", StringComparison.OrdinalIgnoreCase) ||
                           string.Equals(user.RoleName, "SuperAdmin", StringComparison.OrdinalIgnoreCase);

            if (!isAdmin)
            {
                // Regular users only see their own interviews
                var interviewName = user.InterviewName?.Trim();
                var fullName = user.FullName?.Trim();
                var username = user.Username?.Trim();
                var role = user.RoleName?.Trim();

                if (string.Equals(role, "Interviewee", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(role, "Developer", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(role, "Candidate", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(i =>
                        (!string.IsNullOrEmpty(interviewName) && i.IntervieweeName == interviewName) ||
                        (!string.IsNullOrEmpty(fullName) && i.IntervieweeName == fullName) ||
                        (!string.IsNullOrEmpty(username) && i.IntervieweeName == username));
                }
                else if (string.Equals(role, "Job Hunter", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(role, "BD", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(i =>
                        (!string.IsNullOrEmpty(interviewName) && (i.JobHunterName == interviewName || i.InvTo == interviewName)) ||
                        (!string.IsNullOrEmpty(fullName) && (i.JobHunterName == fullName || i.InvTo == fullName)) ||
                        (!string.IsNullOrEmpty(username) && (i.JobHunterName == username || i.InvTo == username)));
                }
                else if (string.Equals(role, "Both", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(i =>
                        (!string.IsNullOrEmpty(interviewName) && (i.IntervieweeName == interviewName || i.JobHunterName == interviewName || i.InvTo == interviewName)) ||
                        (!string.IsNullOrEmpty(fullName) && (i.IntervieweeName == fullName || i.JobHunterName == fullName || i.InvTo == fullName)) ||
                        (!string.IsNullOrEmpty(username) && (i.IntervieweeName == username || i.JobHunterName == username || i.InvTo == username)));
                }
                else
                {
                    query = query.Where(i =>
                        (!string.IsNullOrEmpty(interviewName) && (i.IntervieweeName == interviewName || i.JobHunterName == interviewName || i.InvTo == interviewName)) ||
                        (!string.IsNullOrEmpty(fullName) && (i.IntervieweeName == fullName || i.JobHunterName == fullName || i.InvTo == fullName)) ||
                        (!string.IsNullOrEmpty(username) && (i.IntervieweeName == username || i.JobHunterName == username || i.InvTo == username)));
                }
            }

            if (!string.IsNullOrWhiteSpace(intervieweeParam) && !string.Equals(intervieweeParam, "All", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(i => i.IntervieweeName == intervieweeParam || (i.IntervieweeName != null && i.IntervieweeName.Contains(intervieweeParam)));
            }

            return query;
        }

        [HttpGet]
        public IActionResult GetLeads(
            [FromQuery] string search = null,
            [FromQuery] string status = null,
            [FromQuery] string interviewee = null,
            [FromQuery] string company = null)
        {
            try
            {
                var user = GetCurrentUser();
                if (user == null)
                    return Unauthorized(new { message = "Unauthenticated" });

                var interviews = GetUserInterviewsQuery(user, interviewee).ToList();
                var dbLeads = _context.Leads.AsNoTracking().ToList();

                bool isAdmin = string.Equals(user.RoleName, "Admin", StringComparison.OrdinalIgnoreCase) ||
                               string.Equals(user.RoleName, "HR", StringComparison.OrdinalIgnoreCase) ||
                               string.Equals(user.RoleName, "Manager", StringComparison.OrdinalIgnoreCase) ||
                               string.Equals(user.RoleName, "SuperAdmin", StringComparison.OrdinalIgnoreCase);

                if (!isAdmin)
                {
                    var interviewName = user.InterviewName?.Trim();
                    var fullName = user.FullName?.Trim();
                    var username = user.Username?.Trim();

                    dbLeads = dbLeads.Where(l =>
                        (!string.IsNullOrEmpty(interviewName) && string.Equals(l.Entertains?.Trim(), interviewName, StringComparison.OrdinalIgnoreCase)) ||
                        (!string.IsNullOrEmpty(fullName) && string.Equals(l.Entertains?.Trim(), fullName, StringComparison.OrdinalIgnoreCase)) ||
                        (!string.IsNullOrEmpty(username) && string.Equals(l.Entertains?.Trim(), username, StringComparison.OrdinalIgnoreCase))
                    ).ToList();
                }

                var derivedLeads = new List<LeadDto>();
                
                var groupedInterviews = interviews
                    .Where(i => !string.IsNullOrWhiteSpace(i.CompanyName) && !string.IsNullOrWhiteSpace(i.IntervieweeName))
                    .GroupBy(i => new { Company = i.CompanyName.Trim(), Interviewee = i.IntervieweeName.Trim() });

                var processedPairs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                foreach (var group in groupedInterviews)
                {
                    var companyName = group.Key.Company;
                    var iv = group.Key.Interviewee;
                    var pairKey = $"{iv}|{companyName}";
                    processedPairs.Add(pairKey);

                    var sortedGroup = group
                        .OrderByDescending(i => i.InterviewDate ?? i.JobStartDate ?? i.CreatedAt)
                        .ThenByDescending(i => i.Id)
                        .ToList();

                    var latestInterview = sortedGroup.First();

                    // Find if there's any DB entry for this specific pair
                    var dbOverride = dbLeads.FirstOrDefault(l => !l.IsManual && string.Equals(l.CompanyName?.Trim(), companyName, StringComparison.OrdinalIgnoreCase) && string.Equals(l.Entertains?.Trim(), iv, StringComparison.OrdinalIgnoreCase));

                    string leadStatus = dbOverride?.Status ?? latestInterview.Status ?? "Scheduled";
                    bool isConverted = string.Equals(leadStatus, "converted", StringComparison.OrdinalIgnoreCase) || string.Equals(leadStatus, "hired", StringComparison.OrdinalIgnoreCase);
                    bool hasRejectedInterview = group.Any(i => string.Equals(i.Status, "rejected", StringComparison.OrdinalIgnoreCase));
                    bool hasDroppedInterview = group.Any(i => string.Equals(i.Status, "dropped", StringComparison.OrdinalIgnoreCase));

                    derivedLeads.Add(new LeadDto
                    {
                        Id = dbOverride?.Id ?? 0,
                        CompanyName = companyName,
                        Interviewee = iv,
                        Status = leadStatus,
                        IsConverted = isConverted,
                        Rounds = sortedGroup.Count,
                        LastActivity = group.Max(i => i.InterviewDate ?? i.JobStartDate ?? i.CreatedAt),
                        IsManual = false,
                        Notes = dbOverride?.Notes,
                        HasRejected = hasRejectedInterview,
                        HasDropped = hasDroppedInterview
                    });
                }

                foreach (var manualLead in dbLeads.Where(l => l.IsManual))
                {
                    var iv = manualLead.Entertains?.Trim() ?? "Unknown";
                    var companyName = manualLead.CompanyName?.Trim() ?? "Unknown";
                    var pairKey = $"{iv}|{companyName}";

                    if (processedPairs.Contains(pairKey))
                        continue;

                    derivedLeads.Add(new LeadDto
                    {
                        Id = manualLead.Id,
                        CompanyName = companyName,
                        Interviewee = iv,
                        Status = manualLead.Status ?? "New",
                        IsConverted = string.Equals(manualLead.Status, "converted", StringComparison.OrdinalIgnoreCase),
                        Rounds = manualLead.Rounds ?? 0,
                        LastActivity = manualLead.LastActivity ?? manualLead.CreatedAt,
                        IsManual = true,
                        Notes = manualLead.Notes,
                        HasRejected = string.Equals(manualLead.Status, "rejected", StringComparison.OrdinalIgnoreCase),
                        HasDropped = string.Equals(manualLead.Status, "dropped", StringComparison.OrdinalIgnoreCase)
                    });
                }

                // Stats
                int totalLeads = derivedLeads.Count;
                int leadsConverted = derivedLeads.Count(l => l.IsConverted || string.Equals(l.Status, "converted", StringComparison.OrdinalIgnoreCase) || string.Equals(l.Status, "hired", StringComparison.OrdinalIgnoreCase));
                int rejectedCount = derivedLeads.Count(l => l.HasRejected || string.Equals(l.Status, "rejected", StringComparison.OrdinalIgnoreCase));
                int droppedCount = derivedLeads.Count(l => l.HasDropped || string.Equals(l.Status, "dropped", StringComparison.OrdinalIgnoreCase));
                int closedCount = derivedLeads.Count(l => string.Equals(l.Status, "closed", StringComparison.OrdinalIgnoreCase));
                int deadCount = derivedLeads.Count(l => string.Equals(l.Status, "dead", StringComparison.OrdinalIgnoreCase));

                // Filters
                var filtered = derivedLeads.AsEnumerable();

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var s = search.Trim().ToLower();
                    filtered = filtered.Where(l =>
                        (l.CompanyName != null && l.CompanyName.ToLower().Contains(s)) ||
                        (l.Status != null && l.Status.ToLower().Contains(s)) ||
                        (l.Interviewee != null && l.Interviewee.ToLower().Contains(s)));
                }

                if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "All", StringComparison.OrdinalIgnoreCase))
                {
                    filtered = filtered.Where(l => string.Equals(l.Status, status, StringComparison.OrdinalIgnoreCase));
                }

                if (!string.IsNullOrWhiteSpace(interviewee) && !string.Equals(interviewee, "All", StringComparison.OrdinalIgnoreCase))
                {
                    filtered = filtered.Where(l => string.Equals(l.Interviewee, interviewee, StringComparison.OrdinalIgnoreCase));
                }

                if (!string.IsNullOrWhiteSpace(company) && !string.Equals(company, "All", StringComparison.OrdinalIgnoreCase))
                {
                    filtered = filtered.Where(l => string.Equals(l.CompanyName, company, StringComparison.OrdinalIgnoreCase));
                }

                // Primary sort: Interviewee name A->Z, then by Company
                var sorted = filtered.OrderBy(l => l.Interviewee).ThenBy(l => l.CompanyName).ToList();

                var allInterviewees = derivedLeads
                    .Where(l => !string.IsNullOrWhiteSpace(l.Interviewee))
                    .Select(l => l.Interviewee)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(x => x)
                    .ToList();

                var allCompanies = derivedLeads
                    .Where(l => !string.IsNullOrWhiteSpace(l.CompanyName))
                    .Select(l => l.CompanyName)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(x => x)
                    .ToList();

                return Ok(new
                {
                    data = sorted,
                    stats = new
                    {
                        TotalLeads = totalLeads,
                        LeadsConverted = leadsConverted,
                        Rejected = rejectedCount,
                        Dropped = droppedCount,
                        Closed = closedCount,
                        Dead = deadCount
                    },
                    dropdowns = new
                    {
                        Interviewees = allInterviewees,
                        Companies = allCompanies
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("by-interviewee")]
        public IActionResult GetLeadsByInterviewee()
        {
            try
            {
                var user = GetCurrentUser();
                if (user == null)
                    return Unauthorized(new { message = "Unauthenticated" });

                var interviews = GetUserInterviewsQuery(user).ToList();

                var grouped = interviews
                    .Where(i => !string.IsNullOrWhiteSpace(i.CompanyName) && !string.IsNullOrWhiteSpace(i.IntervieweeName))
                    .GroupBy(i => new { Company = i.CompanyName.Trim().ToLower(), Interviewee = i.IntervieweeName.Trim().ToLower() })
                    .Select(g =>
                    {
                        var sorted = g.OrderByDescending(i => i.InterviewDate ?? i.JobStartDate ?? i.CreatedAt).ToList();
                        var latest = sorted.First();
                        return new IntervieweeLeadDto
                        {
                            Interviewee = latest.IntervieweeName.Trim(),
                            CompanyName = latest.CompanyName.Trim(),
                            TotalRounds = g.Count(),
                            LastActivity = latest.InterviewDate ?? latest.JobStartDate ?? latest.CreatedAt,
                            Status = latest.Status ?? "Scheduled"
                        };
                    })
                    .OrderBy(l => l.Interviewee)
                    .ThenBy(l => l.CompanyName)
                    .ToList();

                return Ok(grouped);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("interviewee-summary")]
        public IActionResult GetIntervieweeSummary()
        {
            try
            {
                var user = GetCurrentUser();
                if (user == null)
                    return Unauthorized(new { message = "Unauthenticated" });

                var interviews = GetUserInterviewsQuery(user).ToList();

                var grouped = interviews
                    .Where(i => !string.IsNullOrWhiteSpace(i.CompanyName) && !string.IsNullOrWhiteSpace(i.IntervieweeName))
                    .GroupBy(i => i.IntervieweeName.Trim().ToLower())
                    .Select(personGroup =>
                    {
                        var originalName = personGroup.First().IntervieweeName.Trim();
                        var companies = personGroup
                            .GroupBy(i => i.CompanyName.Trim().ToLower())
                            .Select(companyGroup =>
                            {
                                var sorted = companyGroup.OrderByDescending(i => i.InterviewDate ?? i.JobStartDate ?? i.CreatedAt).ToList();
                                var latest = sorted.First();
                                return new IntervieweeCompanySummaryDto
                                {
                                    CompanyName = latest.CompanyName.Trim(),
                                    TotalRounds = companyGroup.Count(),
                                    LastActivity = latest.InterviewDate ?? latest.JobStartDate ?? latest.CreatedAt,
                                    Status = latest.Status ?? "Scheduled"
                                };
                            })
                            .OrderBy(c => c.CompanyName)
                            .ToList();

                        return new IntervieweeSummaryDto
                        {
                            Interviewee = originalName,
                            Companies = companies
                        };
                    })
                    .OrderBy(p => p.Interviewee)
                    .ToList();

                return Ok(grouped);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost]
        public IActionResult CreateOrUpdateLead([FromBody] LeadSaveDto model)
        {
            try
            {
                var user = GetCurrentUser();
                if (!CanEdit(user))
                    return StatusCode(403, new { message = "You do not have permission to manage leads." });

                if (model == null || string.IsNullOrWhiteSpace(model.CompanyName) || string.IsNullOrWhiteSpace(model.Interviewee))
                    return BadRequest(new { message = "Company Name and Interviewee are required." });

                var companyName = model.CompanyName.Trim();
                var interviewee = model.Interviewee.Trim();

                // Check if lead already exists in DB
                var existing = _context.Leads.FirstOrDefault(l => l.CompanyName == companyName && l.Entertains == interviewee);
                if (existing != null)
                {
                    // Update existing override/manual lead
                    existing.Status = model.Status;
                    existing.Notes = model.Notes;
                    existing.IsConverted = string.Equals(model.Status, "converted", StringComparison.OrdinalIgnoreCase);
                    existing.UpdatedAt = DateTime.UtcNow;
                    if (model.LastActivity.HasValue) existing.LastActivity = model.LastActivity;
                    if (model.Rounds.HasValue) existing.Rounds = model.Rounds;

                    _context.SaveChanges();
                    return Ok(existing);
                }
                else
                {
                    // Create new lead
                    var lead = new Lead
                    {
                        CompanyName = companyName,
                        Status = model.Status,
                        Entertains = interviewee,
                        Notes = model.Notes,
                        IsConverted = string.Equals(model.Status, "converted", StringComparison.OrdinalIgnoreCase),
                        IsManual = model.IsManual,
                        LastActivity = model.LastActivity ?? DateTime.UtcNow,
                        Rounds = model.Rounds ?? 0,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    _context.Leads.Add(lead);
                    _context.SaveChanges();
                    return Ok(lead);
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public IActionResult DeleteLead(int id)
        {
            try
            {
                var user = GetCurrentUser();
                if (!CanEdit(user))
                    return StatusCode(403, new { message = "You do not have permission to delete leads." });

                var lead = _context.Leads.FirstOrDefault(l => l.Id == id);
                if (lead == null)
                    return NotFound(new { message = "Lead not found." });

                _context.Leads.Remove(lead);
                _context.SaveChanges();
                return Ok(new { message = "Lead deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }

    public class LeadDto
    {
        public int Id { get; set; }
        public string Interviewee { get; set; }
        public string CompanyName { get; set; }
        public string Status { get; set; }
        public bool IsConverted { get; set; }
        public int Rounds { get; set; }
        public DateTime? LastActivity { get; set; }
        public bool IsManual { get; set; }
        public string Notes { get; set; }
        public bool HasRejected { get; set; }
        public bool HasDropped { get; set; }
    }

    public class LeadSaveDto
    {
        public string CompanyName { get; set; }
        public string Status { get; set; }
        public string Interviewee { get; set; }
        public string Notes { get; set; }
        public bool IsManual { get; set; } = false;
        public int? Rounds { get; set; }
        public DateTime? LastActivity { get; set; }
    }

    public class IntervieweeLeadDto
    {
        public string Interviewee { get; set; }
        public string CompanyName { get; set; }
        public int TotalRounds { get; set; }
        public DateTime? LastActivity { get; set; }
        public string Status { get; set; }
    }

    public class IntervieweeSummaryDto
    {
        public string Interviewee { get; set; }
        public List<IntervieweeCompanySummaryDto> Companies { get; set; }
    }

    public class IntervieweeCompanySummaryDto
    {
        public string CompanyName { get; set; }
        public int TotalRounds { get; set; }
        public DateTime? LastActivity { get; set; }
        public string Status { get; set; }
    }
}
