using System;
using System.Collections.Generic;
using System.Linq;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using RizvizERP.API.Models;
using RizvizERP.API.Data;
using RizvizERP.API.Services;
using Microsoft.EntityFrameworkCore;

namespace RizvizERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InterviewsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ISyncInterviewDataService _syncService;
        private readonly NotificationService _notificationService;

        public InterviewsController(ApplicationDbContext context, ISyncInterviewDataService syncService, NotificationService notificationService)
        {
            _context = context;
            _syncService = syncService;
            _notificationService = notificationService;
        }

        private static bool IsLiveUatReadOnly =>
            UatSchemaConfiguration.IsEnabled
            && UatSchemaConfiguration.UseLiveInterviewsView
            && !UatSchemaConfiguration.UseExcelSyncedInterviews;

        private User GetCurrentUser()
        {
            var authHeader = Request.Headers["Authorization"].ToString();
            var username = AuthHelper.GetUsernameFromToken(authHeader);
            if (string.IsNullOrEmpty(username)) return null;
            return AuthHelper.GetUserByUsername(username);
        }

        private IQueryable<Interview> InterviewQuery 
        {
            get
            {
                var authHeader = Request.Headers["Authorization"].ToString();
                var sessionId = AuthHelper.GetSessionIdFromToken(authHeader);
                var state = SessionExcelManager.GetState(sessionId);
                var query = (state != null && state.HasUploaded) ? state.Interviews.AsQueryable() : new List<Interview>().AsQueryable();
                var user = GetCurrentUser();

                // Unauthenticated — no token or invalid token → return nothing
                if (user == null)
                    return query.Where(i => false);

                // Admin → return everything
                if (string.Equals(user.RoleName, "Admin", StringComparison.OrdinalIgnoreCase))
                    return query;

                // Interviewee → filter by INTERVIEWEE NAME column
                if (string.Equals(user.RoleName, "Interviewee", StringComparison.OrdinalIgnoreCase))
                    return query.Where(i => i.IntervieweeName == user.InterviewName);

                // Job Hunter → filter by Job Hunter Name column
                if (string.Equals(user.RoleName, "Job Hunter", StringComparison.OrdinalIgnoreCase))
                    return query.Where(i => i.JobHunterName == user.InterviewName);

                // Both → either column matches
                if (string.Equals(user.RoleName, "Both", StringComparison.OrdinalIgnoreCase))
                    return query.Where(i => i.IntervieweeName == user.InterviewName || i.JobHunterName == user.InterviewName);

                // Unknown role → deny
                return query.Where(i => false);
            }
        }

        private static HashSet<string> ParseStatusList(string statuses)
        {
            if (string.IsNullOrWhiteSpace(statuses)) return null;
            var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var part in statuses.Split(',', StringSplitOptions.RemoveEmptyEntries))
            {
                var t = part.Trim();
                if (t.Length > 0) set.Add(t);
            }
            return set.Count > 0 ? set : null;
        }

        private IQueryable<Interview> ApplyInterviewListFilters(
            IQueryable<Interview> query,
            string search,
            string inv_to,
            string interview_type,
            string company,
            string candidate,
            string date_from,
            string date_to,
            string metric,
            string status,
            string statuses,
            string stack)
        {
            var statusSet = ParseStatusList(statuses);
            var useExcelStatusFilter = statusSet != null && statusSet.Count > 0;

            if (!useExcelStatusFilter && !string.IsNullOrEmpty(status) && status != "All")
            {
                var statusFilter = status.Trim();
                if (statusFilter.Equals("Rescheduled", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(i =>
                        i.Status == "Postponed" ||
                        (i.Status != null && i.Status.ToLower().Contains("resched")));
                }
                else
                {
                    query = query.Where(i => i.Status == statusFilter);
                }
            }

            if (!string.IsNullOrEmpty(metric) && metric != "all")
            {
                switch (metric.ToLowerInvariant())
                {
                    case "job_start":
                        query = query.Where(i => i.JobStartDate != null);
                        break;
                    case "job_close":
                        query = query.Where(i => i.JobCloseDate != null);
                        break;
                    case "unique_candidate":
                        query = query.Where(i => i.IntervieweeName != null && i.IntervieweeName != "");
                        break;
                }
            }

            if (!string.IsNullOrEmpty(search))
            {
                search = search.ToLower();
                query = query.Where(i =>
                    (i.IntervieweeName != null && i.IntervieweeName.ToLower().Contains(search)) ||
                    (i.CompanyName != null && i.CompanyName.ToLower().Contains(search)) ||
                    (i.InterviewFor != null && i.InterviewFor.ToLower().Contains(search)) ||
                    (i.JobHunterName != null && i.JobHunterName.ToLower().Contains(search)));
            }

            if (!string.IsNullOrEmpty(inv_to) && inv_to != "All")
                query = query.Where(i => i.InvTo == inv_to);

            if (!string.IsNullOrEmpty(interview_type) && interview_type != "All")
                query = query.Where(i => i.InterviewType == interview_type);

            if (!string.IsNullOrEmpty(company) && company != "All")
                query = query.Where(i => i.CompanyName == company);

            if (!string.IsNullOrEmpty(candidate) && candidate != "All")
                query = query.Where(i => i.IntervieweeName == candidate);

            if (!string.IsNullOrEmpty(stack) && stack != "All")
                query = query.Where(i => i.Stack == stack);

            if (!string.IsNullOrEmpty(date_from) && DateTime.TryParse(date_from, out var df))
            {
                var dfDate = df.Date;
                query = query.Where(i =>
                    (i.JobStartDate != null && i.JobStartDate >= dfDate) ||
                    (i.JobStartDate == null && i.InterviewDate != null && i.InterviewDate >= dfDate));
            }

            if (!string.IsNullOrEmpty(date_to) && DateTime.TryParse(date_to, out var dt))
            {
                var dtEnd = dt.Date.AddDays(1);
                query = query.Where(i =>
                    (i.JobStartDate != null && i.JobStartDate < dtEnd) ||
                    (i.JobStartDate == null && i.InterviewDate != null && i.InterviewDate < dtEnd));
            }

            return query;
        }

        [HttpGet]
        public IActionResult GetInterviews(
            [FromQuery] int page = 1,
            [FromQuery] int limit = 20,
            [FromQuery] string search = null,
            [FromQuery] string inv_to = null,
            [FromQuery] string interview_type = null,
            [FromQuery] string company = null,
            [FromQuery] string candidate = null,
            [FromQuery] string date_from = null,
            [FromQuery] string date_to = null,
            [FromQuery] string metric = null,
            [FromQuery] string status = null,
            [FromQuery] string statuses = null,
            [FromQuery] string stack = null)
        {
            try
            {
                var query = ApplyInterviewListFilters(
                    InterviewQuery, search, inv_to, interview_type, company, candidate, date_from, date_to, metric, status, statuses, stack);

                var statusSet = ParseStatusList(statuses);
                var uniqueMetric = string.Equals(metric, "unique_candidate", StringComparison.OrdinalIgnoreCase);
                var needsMemory = statusSet != null || uniqueMetric;

                List<Interview> pageItems;
                int total;

                if (needsMemory)
                {
                    var list = query.ToList();
                    if (statusSet != null)
                        list = list.Where(i => InterviewRowStatusHelper.MatchesAnyStatus(i, statusSet)).ToList();
                    if (uniqueMetric)
                        list = InterviewRowStatusHelper.ApplyUniqueCandidateMetric(list);

                    total = list.Count;
                    pageItems = list
                        .Skip((page - 1) * limit)
                        .Take(limit)
                        .ToList();
                }
                else
                {
                    total = query.Count();
                    pageItems = query
                        .OrderByDescending(i => i.JobStartDate ?? i.InterviewDate)
                        .ThenByDescending(i => i.Id)
                        .Skip((page - 1) * limit)
                        .Take(limit)
                        .ToList();
                }

                return Ok(new { data = pageItems, total, page, limit, metric = metric ?? "all" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>Counts per Excel STATUS value for the current user's filtered dataset.</summary>
        [HttpGet("status-breakdown")]
        public IActionResult GetStatusBreakdown(
            [FromQuery] string search = null,
            [FromQuery] string inv_to = null,
            [FromQuery] string interview_type = null,
            [FromQuery] string company = null,
            [FromQuery] string candidate = null,
            [FromQuery] string date_from = null,
            [FromQuery] string date_to = null,
            [FromQuery] string metric = null,
            [FromQuery] string stack = null)
        {
            try
            {
                var query = ApplyInterviewListFilters(
                    InterviewQuery, search, inv_to, interview_type, company, candidate, date_from, date_to, metric, null, null, stack);

                var list = query.ToList();
                if (string.Equals(metric, "unique_candidate", StringComparison.OrdinalIgnoreCase))
                    list = InterviewRowStatusHelper.ApplyUniqueCandidateMetric(list);

                var breakdown = list
                    .GroupBy(InterviewRowStatusHelper.GetDisplayStatus)
                    .Select(g => new { status = g.Key, count = g.Count() })
                    .OrderByDescending(x => x.count)
                    .ThenBy(x => x.status)
                    .ToList();

                return Ok(new { statuses = breakdown });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("candidate-names")]
        public IActionResult GetCandidateNames()
        {
            try
            {
                var names = InterviewQuery
                    .Where(i => i.IntervieweeName != null && i.IntervieweeName != "")
                    .Select(i => i.IntervieweeName.Trim())
                    .Distinct()
                    .OrderBy(n => n)
                    .ToList();
                return Ok(names);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("company-names")]
        public IActionResult GetCompanyNames()
        {
            try
            {
                var names = InterviewQuery
                    .Where(i => i.CompanyName != null && i.CompanyName != "")
                    .Select(i => i.CompanyName.Trim())
                    .Distinct()
                    .OrderBy(n => n)
                    .ToList();
                return Ok(names);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("stack-names")]
        public IActionResult GetStackNames()
        {
            try
            {
                var names = InterviewQuery
                    .Where(i => i.Stack != null && i.Stack != "")
                    .Select(i => i.Stack.Trim())
                    .Distinct()
                    .OrderBy(n => n)
                    .ToList();
                return Ok(names);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("refresh")]
        public IActionResult RefreshFromExcel()
        {
            try
            {
                var result = _syncService.SyncFromExcel("ManualRefresh", replaceAll: false);
                return Ok(new
                {
                    totalRows = result.TotalRows,
                    insertedRows = result.InsertedRows,
                    updatedRows = result.UpdatedRows,
                    unchangedRows = result.UnchangedRows,
                    failedRows = result.FailedRows,
                    syncedAt = result.SyncedAt,
                    sourcePath = result.SourcePath,
                    sourceFileLastModified = result.SourceFileLastModified,
                    message = result.Message,
                    errors = result.Errors,
                    changes = result.Changes.Select(c => new
                    {
                        c.Sr,
                        c.IntervieweeName,
                        c.CompanyName,
                        c.ChangeType,
                        c.Summary,
                        c.FieldChanges,
                        c.OldRow,
                        c.NewRow,
                        c.RowFields
                    })
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("sync-upload")]
        public IActionResult SyncUploadedExcel([FromForm] Microsoft.AspNetCore.Http.IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file uploaded." });

            var ext = Path.GetExtension(file.FileName)?.ToLowerInvariant();
            if (ext != ".xlsx" && ext != ".csv")
                return BadRequest(new { message = "Only Excel (.xlsx) and CSV (.csv) files are supported." });

            try
            {
                // Copy to a temp file
                var tempPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N") + ext);
                using (var stream = new FileStream(tempPath, FileMode.Create))
                {
                    file.CopyTo(stream);
                }

                var parsedRows = SeedHelper.ParseInterviewFile(tempPath);
                if (parsedRows.Count > 0)
                {
                    var headers = parsedRows[0].Headers;
                    if (!SeedHelper.HasRequiredHeaders(headers, out var missingRequired))
                    {
                        var missingStr = string.Join(", ", missingRequired);
                        return BadRequest(new { message = $"Uploaded file is missing required columns: {missingStr}." });
                    }
                }
                else
                {
                    return BadRequest(new { message = "The uploaded file contains no rows." });
                }

                // Map parsed rows to Interviews
                var newInterviews = new List<Interview>();
                var syncTime = DateTime.UtcNow;
                foreach (var parsed in parsedRows)
                {
                    try
                    {
                        var incoming = SeedHelper.MapParsedRow(parsed);
                        if (!string.IsNullOrWhiteSpace(incoming.IntervieweeName))
                        {
                            incoming.InterviewCode = InterviewCodeHelper.BuildCode(incoming);
                            incoming.Status = InterviewCodeHelper.NormalizeStatus(incoming.Status, incoming.InterviewType);
                            incoming.LastSyncedAt = syncTime;
                            incoming.CreatedAt = syncTime;
                            incoming.UpdatedAt = syncTime;
                            newInterviews.Add(incoming);
                        }
                    }
                    catch { /* skip bad rows */ }
                }

                var authHeader = Request.Headers["Authorization"].ToString();
                var username = AuthHelper.GetUsernameFromToken(authHeader) ?? "Admin";
                var sessionId = AuthHelper.GetSessionIdFromToken(authHeader);
                if (string.IsNullOrEmpty(sessionId))
                    return BadRequest(new { message = "No active session. Please log in again." });

                var state = SessionExcelManager.GetOrCreateState(sessionId, username);
                var fileHash = SessionExcelManager.ComputeFileHash(tempPath);

                if (!state.HasUploaded)
                {
                    // Copy to persistent path
                    var destPath = ResolvePersistentPath(file.FileName);
                    try
                    {
                        System.IO.File.Copy(tempPath, destPath, true);
                    }
                    catch { /* log or handle write error if needed */ }

                    // Clean up temp file
                    try { System.IO.File.Delete(tempPath); } catch {}

                    // First upload: immediately save
                    state.Interviews = newInterviews;
                    state.HasUploaded = true;
                    state.LastFileHash = fileHash;
                    state.UploadedAt = syncTime;
                    state.UploadedFileName = file.FileName;

                    return Ok(new
                    {
                        requiresConfirmation = false,
                        totalRows = newInterviews.Count,
                        message = "First-time Excel upload accepted and loaded successfully.",
                        fileName = file.FileName
                    });
                }
                else
                {
                    // Subsequent upload: generate diff and request confirmation
                    var diff = SessionExcelManager.GenerateDiff(state.Interviews, newInterviews);
                    if (!diff.HasChanges)
                    {
                        state.Interviews = newInterviews;
                        state.LastFileHash = fileHash;
                        state.UploadedFileName = file.FileName;

                        // Copy to persistent path
                        var destPath = ResolvePersistentPath(file.FileName);
                        try
                        {
                            System.IO.File.Copy(tempPath, destPath, true);
                        }
                        catch {}

                        // Clean up temp file
                        try { System.IO.File.Delete(tempPath); } catch {}

                        return Ok(new
                        {
                            requiresConfirmation = false,
                            totalRows = newInterviews.Count,
                            message = "No changes detected. Excel data matched existing session.",
                            fileName = file.FileName
                        });
                    }

                    // Save new file to persistent path so ExcelSyncPoller can detect it.
                    // IMPORTANT: do NOT update state.LastFileHash here — the old hash stays so
                    // CheckExcelChanges detects the mismatch on the next poll and shows the notification.
                    var destPathForPoller = ResolvePersistentPath(file.FileName);
                    try { System.IO.File.Copy(tempPath, destPathForPoller, true); } catch {}

                    // Save to temporary cache pending confirmation (for browser upload confirmation UI)
                    SessionExcelManager.SetTempInterviews(sessionId, newInterviews);
                    SessionExcelManager.SetTempFileHash(sessionId, fileHash);
                    state.TempUploadedFileName = file.FileName;
                    state.TempFilePath = tempPath;

                    return Ok(new
                    {
                        requiresConfirmation = true,
                        diff = new
                        {
                            inserted = diff.Inserted.Select(i => new { i.Sr, i.IntervieweeName, i.CompanyName, i.Status, i.InterviewDate, i.JobHunterName }),
                            deleted  = diff.Deleted.Select(i  => new { i.Sr, i.IntervieweeName, i.CompanyName, i.Status, i.InterviewDate, i.JobHunterName }),
                            updated  = diff.Updated
                        },
                        fileName = file.FileName
                    });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("confirm-upload")]
        public IActionResult ConfirmUploadedExcel()
        {
            try
            {
                var authHeader = Request.Headers["Authorization"].ToString();
                var sessionId = AuthHelper.GetSessionIdFromToken(authHeader);
                if (string.IsNullOrEmpty(sessionId))
                    return BadRequest(new { message = "No active session. Please log in again." });

                var state = SessionExcelManager.GetState(sessionId);
                if (state == null)
                    return BadRequest(new { message = "Session not found." });

                var tempInterviews = SessionExcelManager.GetTempInterviews(sessionId);
                var tempHash = SessionExcelManager.GetTempFileHash(sessionId);

                if (tempInterviews == null)
                    return BadRequest(new { message = "No pending Excel confirmation found for this session." });

                // Overwrite the active state
                state.Interviews = tempInterviews;
                state.HasUploaded = true;
                if (!string.IsNullOrEmpty(tempHash))
                    state.LastFileHash = tempHash;
                state.UploadedAt = DateTime.UtcNow;
                if (!string.IsNullOrEmpty(state.TempUploadedFileName))
                {
                    if (!string.IsNullOrEmpty(state.TempFilePath) && System.IO.File.Exists(state.TempFilePath))
                    {
                        var destPath = ResolvePersistentPath(state.TempUploadedFileName);
                        try
                        {
                            System.IO.File.Copy(state.TempFilePath, destPath, true);
                        }
                        catch {}
                        try { System.IO.File.Delete(state.TempFilePath); } catch {}
                    }

                    state.UploadedFileName = state.TempUploadedFileName;
                    state.TempUploadedFileName = null;
                    state.TempFilePath = null;
                }

                SessionExcelManager.ClearTemp(sessionId);

                return Ok(new { message = "Excel changes confirmed and applied to session." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("/api/excel/session-status")]
        public IActionResult GetSessionStatus()
        {
            try
            {
                var authHeader = Request.Headers["Authorization"].ToString();
                var sessionId = AuthHelper.GetSessionIdFromToken(authHeader);
                if (string.IsNullOrEmpty(sessionId))
                    return Ok(new { hasUploaded = false });

                var state = SessionExcelManager.GetState(sessionId);
                return Ok(new { 
                    hasUploaded = state != null && state.HasUploaded,
                    fileName = state?.UploadedFileName
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("/api/excel/check-changes")]
        public IActionResult CheckExcelChanges()
        {
            try
            {
                var authHeader = Request.Headers["Authorization"].ToString();
                var sessionId = AuthHelper.GetSessionIdFromToken(authHeader);
                if (string.IsNullOrEmpty(sessionId))
                    return Ok(new { hasChanges = false });

                var state = SessionExcelManager.GetState(sessionId);
                // Only run if admin uploaded a file in THIS session
                if (state == null || !state.HasUploaded || string.IsNullOrEmpty(state.LastFileHash))
                    return Ok(new { hasChanges = false });

                // Resolve path dynamically (watches repo root for the uploaded file name, falling back to local persistent copy)
                var localPath = ResolveSourcePathForSession(state);
                if (string.IsNullOrEmpty(localPath) || !System.IO.File.Exists(localPath))
                    return Ok(new { hasChanges = false });

                var currentHash = SessionExcelManager.ComputeFileHash(localPath);
                if (string.IsNullOrEmpty(currentHash))
                    return Ok(new { hasChanges = false });

                // No change — hashes match
                if (currentHash == state.LastFileHash)
                    return Ok(new { hasChanges = false });

                // Hash changed — file was saved/edited by admin after upload
                var parsedRows = SeedHelper.ParseInterviewFile(localPath);
                var newInterviews = new List<Interview>();
                var syncTime = DateTime.UtcNow;
                foreach (var parsed in parsedRows)
                {
                    try
                    {
                        var incoming = SeedHelper.MapParsedRow(parsed);
                        if (!string.IsNullOrWhiteSpace(incoming.IntervieweeName))
                        {
                            incoming.InterviewCode = InterviewCodeHelper.BuildCode(incoming);
                            incoming.Status = InterviewCodeHelper.NormalizeStatus(incoming.Status, incoming.InterviewType);
                            incoming.LastSyncedAt = syncTime;
                            incoming.CreatedAt = syncTime;
                            incoming.UpdatedAt = syncTime;
                            newInterviews.Add(incoming);
                        }
                    }
                    catch { /* skip bad rows */ }
                }

                var diff = SessionExcelManager.GenerateDiff(state.Interviews, newInterviews);

                // Always update in-memory state to latest file
                state.Interviews = newInterviews;
                state.LastFileHash = currentHash;

                if (diff.HasChanges)
                {
                    return Ok(new
                    {
                        hasChanges = true,
                        inserted = diff.Inserted.Select(i => new { i.Sr, i.IntervieweeName, i.CompanyName, i.Status, i.InterviewDate, i.JobHunterName }),
                        deleted  = diff.Deleted.Select(i  => new { i.Sr, i.IntervieweeName, i.CompanyName, i.Status, i.InterviewDate, i.JobHunterName }),
                        updated  = diff.Updated,
                        fileName = state.UploadedFileName ?? Path.GetFileName(localPath)
                    });
                }

                return Ok(new { hasChanges = false });
            }
            catch (Exception ex)
            {
                // Suppress background errors — never crash the poller
                return Ok(new { hasChanges = false, error = ex.Message });
            }
        }

        [HttpGet("sync-status")]
        public IActionResult GetSyncStatus()
        {
            try
            {
                return Ok(_syncService.GetSyncStatus());
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("last-sync-result")]
        public IActionResult GetLastSyncResult()
        {
            try
            {
                var result = _syncService.GetLastSyncResult();
                return Ok(new
                {
                    totalRows = result.TotalRows,
                    insertedRows = result.InsertedRows,
                    updatedRows = result.UpdatedRows,
                    unchangedRows = result.UnchangedRows,
                    failedRows = result.FailedRows,
                    syncedAt = result.SyncedAt,
                    message = result.Message,
                    errors = result.Errors,
                    changes = result.Changes.Select(c => new
                    {
                        c.Sr,
                        c.IntervieweeName,
                        c.CompanyName,
                        c.ChangeType,
                        c.Summary,
                        c.FieldChanges,
                        c.OldRow,
                        c.NewRow,
                        c.RowFields
                    })
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("column-headers")]
        public IActionResult GetColumnHeaders()
        {
            try
            {
                var headers = new List<string>();
                var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                var authHeader = Request.Headers["Authorization"].ToString();
                var sessionId = AuthHelper.GetSessionIdFromToken(authHeader);
                var state = SessionExcelManager.GetState(sessionId);

                var samples = (state != null && state.HasUploaded)
                    ? state.Interviews
                        .Where(i => i.RawRowJson != null && i.RawRowJson != "")
                        .OrderByDescending(i => i.UpdatedAt)
                        .Take(50)
                        .Select(i => i.RawRowJson)
                        .ToList()
                    : new List<string>();

                foreach (var json in samples)
                {
                    try
                    {
                        var dict = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(json);
                        if (dict == null) continue;
                        foreach (var key in dict.Keys)
                        {
                            if (!string.IsNullOrWhiteSpace(key) && seen.Add(key))
                                headers.Add(key);
                        }
                    }
                    catch { /* skip bad json */ }
                }

                if (headers.Count == 0)
                {
                    headers = new List<string>
                    {
                        "Inv. To", "Sr.", "Job Hunter Name:", "INTERVIEW FOR :", "INTERVIEWEE NAME :",
                        "COMPANY NAME :", "Job Start Date", "Job Close Date", "Interview Type",
                        "First Salary", "JH Suggest", "Interview Charges", "JH Due",
                        "First Payment On Job", "Second Payment On Job", "Balance Payable"
                    };
                }

                return Ok(new { headers });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>All interviews for calendar (no pagination — same rows as list/grid).</summary>
        [HttpGet("calendar")]
        public IActionResult GetInterviewsForCalendar()
        {
            try
            {
                var all = InterviewQuery
                    .OrderByDescending(i => i.JobStartDate ?? i.InterviewDate ?? i.JobCloseDate)
                    .ThenByDescending(i => i.Id)
                    .ToList();
                return Ok(new { data = all, total = all.Count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("stats")]
        public IActionResult GetStats()
        {
            try
            {
                var all = InterviewQuery.ToList();
                var total = all.Count;
                var withJobStart = all.Count(i => i.JobStartDate != null);
                var withJobClose = all.Count(i => i.JobCloseDate != null);
                var distinctCandidates = all
                    .Where(i => !string.IsNullOrWhiteSpace(i.IntervieweeName))
                    .Select(i => i.IntervieweeName.Trim().ToLowerInvariant())
                    .Distinct()
                    .Count();

                var invToCounts = all
                    .GroupBy(i => i.InvTo ?? "Unknown")
                    .Select(g => new { name = g.Key, count = g.Count() })
                    .ToList();

                return Ok(new {
                    total,
                    withJobStart,
                    withJobClose,
                    distinctCandidates,
                    invToCounts
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateInterview([FromBody] Interview interview)
        {
            if (IsLiveUatReadOnly)
                return BadRequest(new { message = "Interviews are read-only from UAT (mkt.interview_*). Edit in the source system." });
            try
            {
                var user = GetCurrentUser();
                interview.CreatedAt = DateTime.UtcNow;
                interview.UpdatedAt = DateTime.UtcNow;
                _context.Interviews.Add(interview);
                _context.SaveChanges();

                // Broadcast live notification
                await _notificationService.BroadcastNewInterview(interview, user?.Username ?? "System");

                return Ok(interview);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateInterview(int id, [FromBody] Interview updatedData)
        {
            if (IsLiveUatReadOnly)
                return BadRequest(new { message = "Interviews are read-only from UAT (mkt.interview_*). Edit in the source system." });
            
            var user = GetCurrentUser();
            if (user == null)
                return Unauthorized(new { message = "You must be logged in to edit." });

            try
            {
                var existing = _context.Interviews.Find(id);
                if (existing == null) return NotFound(new { message = "Interview not found" });

                if (!string.Equals(user.RoleName, "Admin", StringComparison.OrdinalIgnoreCase))
                {
                    bool canEdit = false;
                    if (string.Equals(user.RoleName, "Interviewee", StringComparison.OrdinalIgnoreCase))
                    {
                        canEdit = string.Equals(existing.IntervieweeName, user.InterviewName, StringComparison.OrdinalIgnoreCase);
                    }
                    else if (string.Equals(user.RoleName, "Job Hunter", StringComparison.OrdinalIgnoreCase))
                    {
                        canEdit = string.Equals(existing.JobHunterName, user.InterviewName, StringComparison.OrdinalIgnoreCase);
                    }
                    else if (string.Equals(user.RoleName, "Both", StringComparison.OrdinalIgnoreCase))
                    {
                        canEdit = string.Equals(existing.IntervieweeName, user.InterviewName, StringComparison.OrdinalIgnoreCase) || 
                                  string.Equals(existing.JobHunterName, user.InterviewName, StringComparison.OrdinalIgnoreCase);
                    }

                    if (!canEdit)
                        return StatusCode(403, new { message = "You do not have permission to edit this row." });
                }

                // Clone existing for notification delta detection
                var oldInterview = new Interview
                {
                    Status = existing.Status,
                    CompanyName = existing.CompanyName,
                    IntervieweeName = existing.IntervieweeName,
                    JobHunterName = existing.JobHunterName
                };

                existing.InvTo = updatedData.InvTo;
                existing.InterviewDate = updatedData.InterviewDate;
                existing.InterviewFor = updatedData.InterviewFor;
                existing.IntervieweeName = updatedData.IntervieweeName;
                existing.JobHunterName = updatedData.JobHunterName;
                existing.CompanyName = updatedData.CompanyName;
                existing.InterviewType = updatedData.InterviewType;
                existing.JobStartDate = updatedData.JobStartDate;
                existing.JobCloseDate = updatedData.JobCloseDate;
                existing.FirstSalary = updatedData.FirstSalary;
                existing.JhSuggest = updatedData.JhSuggest;
                existing.InterviewCharges = updatedData.InterviewCharges;
                existing.JhDue = updatedData.JhDue;
                existing.FirstPaymentOnJob = updatedData.FirstPaymentOnJob;
                existing.SecondPaymentOnJob = updatedData.SecondPaymentOnJob;
                existing.BalancePayable = updatedData.BalancePayable;
                existing.UpdatedAt = DateTime.UtcNow;

                // Log and write back to Excel
                InterviewExcelWriter.UpdateRowAndLog(existing, updatedData, user.Username);

                _context.SaveChanges();

                // Broadcast live notification
                await _notificationService.BroadcastInterviewChange(oldInterview, existing, user.Username);

                return Ok(existing);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpDelete("{id:int}")]
        public IActionResult DeleteInterview(int id)
        {
            if (IsLiveUatReadOnly)
                return BadRequest(new { message = "Interviews are read-only from UAT (mkt.interview_*)." });

            var user = GetCurrentUser();
            if (user == null || !string.Equals(user.RoleName, "Admin", StringComparison.OrdinalIgnoreCase))
                return StatusCode(403, new { message = "Only Admin can delete rows." });

            try
            {
                var existing = _context.Interviews.Find(id);
                if (existing == null) return NotFound(new { message = "Interview not found" });

                _context.Interviews.Remove(existing);
                _context.SaveChanges();
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("candidates")]
        public IActionResult GetCandidates([FromQuery] string month = null, [FromQuery] string search = null)
        {
            try
            {
                var query = InterviewQuery;

                if (!string.IsNullOrEmpty(month) && month != "All Time")
                {
                    // month expected format: "2026-05"
                    if (DateTime.TryParse(month + "-01", out var date))
                    {
                        var nextMonth = date.AddMonths(1);
                        query = query.Where(i =>
                            (i.InterviewDate >= date && i.InterviewDate < nextMonth) ||
                            (i.InterviewDate == null && i.JobStartDate >= date && i.JobStartDate < nextMonth));
                    }
                }

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var term = search.Trim().ToLower();
                    query = query.Where(i =>
                        (i.IntervieweeName != null && i.IntervieweeName.ToLower().Contains(term)) ||
                        (i.CompanyName != null && i.CompanyName.ToLower().Contains(term)) ||
                        (i.InterviewFor != null && i.InterviewFor.ToLower().Contains(term)));
                }

                var list = query.ToList();

                // Load all DB leads + users once for enrichment
                var allDbLeads = _context.Leads.AsNoTracking().ToList();
                var allUsers   = _context.Users.AsNoTracking().ToList();

                var grouped = list
                    .Where(i => !string.IsNullOrWhiteSpace(i.IntervieweeName))
                    .GroupBy(i => i.IntervieweeName.Trim().ToLowerInvariant())
                    .Select(g => {
                        var displayName = g
                            .Select(x => x.IntervieweeName.Trim())
                            .FirstOrDefault();

                        var mostCommonType = g.GroupBy(x => x.InterviewType)
                                              .OrderByDescending(xg => xg.Count())
                                              .Select(xg => xg.Key)
                                              .FirstOrDefault();

                        var companies = g
                            .Select(x => x.CompanyName)
                            .Where(c => !string.IsNullOrWhiteSpace(c))
                            .Select(c => c.Trim())
                            .Where(c => !SeedHelper.LooksLikeDateOrPlaceholder(c))
                            .Distinct(StringComparer.OrdinalIgnoreCase)
                            .OrderBy(c => c)
                            .ToList();

                        // Unique stacks (non-null, non-empty)
                        var stacks = g
                            .Select(x => x.Stack)
                            .Where(s => !string.IsNullOrWhiteSpace(s))
                            .Select(s => s.Trim())
                            .Distinct(StringComparer.OrdinalIgnoreCase)
                            .OrderBy(s => s)
                            .ToList();

                        // Email lookup: Users table first, then Candidates table
                        var email = allUsers
                            .FirstOrDefault(u =>
                                string.Equals(u.InterviewName, displayName, StringComparison.OrdinalIgnoreCase) ||
                                string.Equals(u.FullName, displayName, StringComparison.OrdinalIgnoreCase))
                            ?.Email;

                        // Earliest activity date
                        var addedDate = g.Min(x => x.InterviewDate ?? x.JobStartDate ?? x.CreatedAt);

                        // ── Leads per candidate ──
                        // A lead = unique (company, interviewee) pair from either interviews or manual DB leads
                        // Derived from interview groups (same logic as LeadsController)
                        var interviewLeadPairs = g
                            .Where(x => !string.IsNullOrWhiteSpace(x.CompanyName))
                            .GroupBy(x => x.CompanyName.Trim().ToLowerInvariant())
                            .Select(compGroup =>
                            {
                                var companyName = compGroup.First().CompanyName.Trim();
                                var dbOverride  = allDbLeads.FirstOrDefault(l =>
                                    !l.IsManual &&
                                    string.Equals(l.CompanyName?.Trim(), companyName, StringComparison.OrdinalIgnoreCase) &&
                                    string.Equals(l.Entertains?.Trim(), displayName, StringComparison.OrdinalIgnoreCase));

                                var latestStatus = dbOverride?.Status
                                    ?? compGroup.OrderByDescending(x => x.InterviewDate ?? x.JobStartDate ?? x.CreatedAt)
                                                .First().Status
                                    ?? "Scheduled";

                                bool hasConverted = string.Equals(latestStatus, "converted", StringComparison.OrdinalIgnoreCase)
                                                 || string.Equals(latestStatus, "Job Start", StringComparison.OrdinalIgnoreCase);
                                bool hasRejected  = compGroup.Any(x => string.Equals(x.Status, "rejected", StringComparison.OrdinalIgnoreCase))
                                                 || string.Equals(latestStatus, "rejected", StringComparison.OrdinalIgnoreCase);
                                bool hasDropped   = compGroup.Any(x => string.Equals(x.Status, "dropped", StringComparison.OrdinalIgnoreCase))
                                                 || string.Equals(latestStatus, "dropped", StringComparison.OrdinalIgnoreCase);
                                return new { hasConverted, hasRejected, hasDropped };
                            })
                            .ToList();

                        // Also include manual leads that don't overlap with interview-derived ones
                        var interviewCompanyKeys = g
                            .Where(x => !string.IsNullOrWhiteSpace(x.CompanyName))
                            .Select(x => x.CompanyName.Trim().ToLowerInvariant())
                            .Distinct()
                            .ToHashSet();

                        var manualLeadOutcomes = allDbLeads
                            .Where(l => l.IsManual &&
                                string.Equals(l.Entertains?.Trim(), displayName, StringComparison.OrdinalIgnoreCase) &&
                                !interviewCompanyKeys.Contains(l.CompanyName?.Trim().ToLowerInvariant() ?? ""))
                            .Select(l => new {
                                hasConverted = string.Equals(l.Status, "converted", StringComparison.OrdinalIgnoreCase),
                                hasRejected  = string.Equals(l.Status, "rejected",  StringComparison.OrdinalIgnoreCase),
                                hasDropped   = string.Equals(l.Status, "dropped",   StringComparison.OrdinalIgnoreCase)
                            })
                            .ToList();

                        var allLeadOutcomes = interviewLeadPairs.Concat(manualLeadOutcomes).ToList();
                        int leadsCount     = allLeadOutcomes.Count;
                        int convertedCount = allLeadOutcomes.Count(x => x.hasConverted);
                        int rejectedCount  = allLeadOutcomes.Count(x => x.hasRejected);
                        int droppedCount   = allLeadOutcomes.Count(x => x.hasDropped);

                        const int previewLimit = 5;
                        return new {
                            interviewee_name    = displayName,
                            initial             = displayName.Substring(0, 1).ToUpper(),
                            email               = email ?? "",
                            interview_count     = g.Count(),
                            leads_count         = leadsCount,
                            company_count       = companies.Count,
                            companies           = companies.Take(previewLimit).ToList(),
                            companies_more_count= Math.Max(0, companies.Count - previewLimit),
                            stacks              = stacks,
                            latest_date         = g.Max(x => x.InterviewDate ?? x.JobStartDate),
                            added_date          = addedDate,
                            top_type            = mostCommonType,
                            converted_count     = convertedCount,
                            rejected_count      = rejectedCount,
                            dropped_count       = droppedCount,
                        };
                    })
                    .OrderByDescending(x => x.latest_date)
                    .ToList();

                return Ok(grouped);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("candidate/{name}")]
        public IActionResult GetCandidateDetail(string name)
        {
            try
            {
                var decodedName = Uri.UnescapeDataString(name).Trim().ToLowerInvariant();
                if (string.IsNullOrEmpty(decodedName))
                    return BadRequest(new { message = "Candidate name is required" });

                var records = InterviewQuery.AsEnumerable()
                    .Where(i => !string.IsNullOrWhiteSpace(i.IntervieweeName) &&
                                i.IntervieweeName.Trim().ToLowerInvariant() == decodedName)
                    .OrderByDescending(i => i.InterviewDate ?? i.JobStartDate)
                    .ToList();

                if (!records.Any())
                    return NotFound(new { message = $"No interviews found for candidate '{decodedName}'" });

                var totalInterviews = records.Count;
                var totalCharges = records.Sum(i => i.InterviewCharges);
                var totalBalance = records.Sum(i => i.BalancePayable);
                var jobsPlaced = records.Count(i => i.JobStartDate != null);
                var companyCount = records
                    .Select(i => i.CompanyName)
                    .Where(c => !string.IsNullOrWhiteSpace(c) && !SeedHelper.LooksLikeDateOrPlaceholder(c))
                    .Select(c => c.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .Count();

                var result = new
                {
                    summary = new
                    {
                        totalInterviews,
                        totalCharges,
                        totalBalance,
                        jobsPlaced,
                        companyCount
                    },
                    records = records.Select(i => new
                    {
                        i.Id,
                        i.Sr,
                        i.InvTo,
                        i.InterviewFor,
                        i.IntervieweeName,
                        i.JobHunterName,
                        i.CompanyName,
                        i.JobStartDate,
                        i.JobCloseDate
                    })
                };
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("seed")]
        public IActionResult SeedFromCsv([FromForm] Microsoft.AspNetCore.Http.IFormFile file = null)
        {
            if (IsLiveUatReadOnly)
                return BadRequest(new { message = "Live UAT interviews cannot be replaced from Excel. Data is loaded from mkt.interview_master / interview_detail." });
            try
            {
                string filePath = null;
                bool isTempFile = false;
                string originalExt = ".csv"; // default

                if (file != null && file.Length > 0)
                {
                    // Preserve the original extension so we can choose the right parser
                    originalExt = Path.GetExtension(file.FileName ?? "").ToLowerInvariant();
                    if (string.IsNullOrEmpty(originalExt)) originalExt = ".csv";

                    // Save upload to a temp file with the correct extension
                    filePath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString() + originalExt);
                    isTempFile = true;
                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        file.CopyTo(stream);
                    }
                }
                else
                {
                    filePath = Path.Combine(Directory.GetCurrentDirectory(), "..", "interviews_seed.csv");
                    if (!System.IO.File.Exists(filePath))
                    {
                        return NotFound(new { message = "Seed CSV file not found at " + filePath });
                    }
                }

                // Block re-seeding via the fallback button (not the upload button)
                if (file == null && _context.Interviews.Any())
                {
                    return BadRequest(new { message = "Database already seeded. Use Upload Excel/CSV to replace records." });
                }

                // File upload replaces all rows so UI matches the file exactly
                if (file != null && _context.Interviews.Any())
                {
                    _context.Interviews.RemoveRange(_context.Interviews.ToList());
                    _context.SaveChanges();
                }

                // ------- Choose parser based on file extension -------
                var parsedRows = SeedHelper.ParseInterviewFile(filePath);

                // Clean up temp file
                if (isTempFile && System.IO.File.Exists(filePath))
                {
                    try { System.IO.File.Delete(filePath); } catch {}
                }

                int imported = 0;

                foreach (var parsed in parsedRows)
                {
                    var interview = SeedHelper.MapParsedRow(parsed);
                    if (string.IsNullOrWhiteSpace(interview.IntervieweeName)) continue;

                    _context.Interviews.Add(interview);
                    imported++;
                }

                _context.SaveChanges();

                return Ok(new {
                    message = file != null
                        ? $"Imported {imported} rows from your file (previous data replaced)."
                        : "Seeded successfully",
                    count = imported,
                    replaced = file != null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("seed/qamer-demo")]
        public IActionResult SeedQamerDemoWeek()
        {
            try
            {
                var filePath = Path.Combine(Directory.GetCurrentDirectory(), "..", "qamer_hassan_week_schedule.csv");
                if (!System.IO.File.Exists(filePath))
                {
                    return NotFound(new { message = "Demo file not found: qamer_hassan_week_schedule.csv" });
                }

                if (_context.Interviews.Any())
                {
                    _context.Interviews.RemoveRange(_context.Interviews.ToList());
                    _context.SaveChanges();
                }

                var parsedRows = SeedHelper.ParseCsvParsed(filePath);
                int imported = 0;
                foreach (var parsed in parsedRows)
                {
                    var interview = SeedHelper.MapParsedRow(parsed);
                    if (string.IsNullOrWhiteSpace(interview.IntervieweeName)) continue;
                    _context.Interviews.Add(interview);
                    imported++;
                }
                _context.SaveChanges();

                return Ok(new
                {
                    message = $"Loaded Qamer Hassan demo week ({imported} interviews, May 26 – Jun 1).",
                    count = imported,
                    replaced = true
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("{id:int}/history")]
        public IActionResult GetInterviewHistory(int id)
        {
            try
            {
                var history = _syncService.GetInterviewHistory(id);
                return Ok(history);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("{id:int}")]
        public IActionResult GetInterview(int id)
        {
            var interview = _context.Interviews.Find(id);
            if (interview == null) return NotFound(new { message = "Interview not found" });
            return Ok(interview);
        }

        private string ResolvePersistentPath(string fileName)
        {
            return Path.Combine(Directory.GetCurrentDirectory(), "last_uploaded_excel.xlsx");
        }

        private string ResolveSourcePath()
        {
            var lastUploadedPath = Path.Combine(Directory.GetCurrentDirectory(), "last_uploaded_excel.xlsx");
            if (System.IO.File.Exists(lastUploadedPath))
                return lastUploadedPath;

            return null;
        }

        private string ResolveSourcePathForSession(SessionExcelState state)
        {
            if (state == null || string.IsNullOrEmpty(state.UploadedFileName))
                return null;

            // 1. Try to find the file in the repo root (useful for local development auto-sync of uploaded file)
            var repoRoot = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), ".."));
            var repoRootPath = Path.Combine(repoRoot, state.UploadedFileName);
            if (System.IO.File.Exists(repoRootPath))
                return repoRootPath;

            // 2. Fall back to the persistent copy in the current directory
            var localPath = Path.Combine(Directory.GetCurrentDirectory(), "last_uploaded_excel.xlsx");
            if (System.IO.File.Exists(localPath))
                return localPath;

            return null;
        }
    }
}
