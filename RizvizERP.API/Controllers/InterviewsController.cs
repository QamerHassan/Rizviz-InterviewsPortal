using System;
using System.Collections.Generic;
using System.Linq;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using RizvizERP.API.Models;
using RizvizERP.API.DTOs;
using RizvizERP.API.Data;
using RizvizERP.API.Services;
using Microsoft.EntityFrameworkCore;
using ClosedXML.Excel;
using System.Data.Common;

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

        private IQueryable<Interview> InterviewQuery 
        {
            get
            {
                return _context.Interviews.AsNoTracking();
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

                bool hasFilters = !string.IsNullOrEmpty(search) ||
                                  !string.IsNullOrEmpty(date_from) ||
                                  !string.IsNullOrEmpty(date_to) ||
                                  (company != null && company != "All") ||
                                  (candidate != null && candidate != "All") ||
                                  (status != null && status != "All") ||
                                  !string.IsNullOrEmpty(statuses) ||
                                  (stack != null && stack != "All");

                DateTime? parsedDateFrom = null;
                if (!string.IsNullOrEmpty(date_from) && DateTime.TryParse(date_from, out var df))
                    parsedDateFrom = df;

                DateTime? parsedDateTo = null;
                if (!string.IsNullOrEmpty(date_to) && DateTime.TryParse(date_to, out var dt))
                    parsedDateTo = dt;

                var archivedList = hasFilters
                    ? ReadArchiveInterviews(parsedDateFrom, parsedDateTo, search, company, candidate, status, statuses, stack)
                    : new List<Interview>();

                var dbList = query.ToList();
                if (statusSet != null)
                    dbList = dbList.Where(i => InterviewRowStatusHelper.MatchesAnyStatus(i, statusSet)).ToList();

                // Merge and deduplicate by Sr + Candidate + Company + Date
                var combined = new List<Interview>();
                var seenKeys = new HashSet<string>();

                foreach (var item in dbList)
                {
                    var key = $"{item.Sr}_{item.IntervieweeName?.Trim().ToLower()}_{item.CompanyName?.Trim().ToLower()}_{item.InterviewDate?.ToString("yyyyMMdd")}";
                    seenKeys.Add(key);
                    combined.Add(item);
                }

                foreach (var item in archivedList)
                {
                    var key = $"{item.Sr}_{item.IntervieweeName?.Trim().ToLower()}_{item.CompanyName?.Trim().ToLower()}_{item.InterviewDate?.ToString("yyyyMMdd")}";
                    if (seenKeys.Contains(key)) continue;
                    seenKeys.Add(key);
                    combined.Add(item);
                }

                if (uniqueMetric)
                    combined = InterviewRowStatusHelper.ApplyUniqueCandidateMetric(combined);
                else
                    combined = combined
                        .OrderByDescending(i => i.JobStartDate ?? i.InterviewDate)
                        .ThenByDescending(i => i.Id)
                        .ToList();

                var total = combined.Count;
                var pageItems = (limit <= 0)
                    ? combined
                    : combined
                        .Skip((page - 1) * limit)
                        .Take(limit)
                        .ToList();

                return Ok(new { data = pageItems, total, page, limit = limit <= 0 ? total : limit, metric = metric ?? "all" });
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

                bool hasFilters = !string.IsNullOrEmpty(search) ||
                                  !string.IsNullOrEmpty(date_from) ||
                                  !string.IsNullOrEmpty(date_to) ||
                                  (company != null && company != "All") ||
                                  (candidate != null && candidate != "All") ||
                                  (stack != null && stack != "All");

                DateTime? parsedDateFrom = null;
                if (!string.IsNullOrEmpty(date_from) && DateTime.TryParse(date_from, out var df))
                    parsedDateFrom = df;

                DateTime? parsedDateTo = null;
                if (!string.IsNullOrEmpty(date_to) && DateTime.TryParse(date_to, out var dt))
                    parsedDateTo = dt;

                var archivedList = hasFilters
                    ? ReadArchiveInterviews(parsedDateFrom, parsedDateTo, search, company, candidate, null, null, stack)
                    : new List<Interview>();

                var dbList = query.ToList();

                var combined = new List<Interview>();
                var seenKeys = new HashSet<string>();

                foreach (var item in dbList)
                {
                    var key = $"{item.Sr}_{item.IntervieweeName?.Trim().ToLower()}_{item.CompanyName?.Trim().ToLower()}_{item.InterviewDate?.ToString("yyyyMMdd")}";
                    seenKeys.Add(key);
                    combined.Add(item);
                }

                foreach (var item in archivedList)
                {
                    var key = $"{item.Sr}_{item.IntervieweeName?.Trim().ToLower()}_{item.CompanyName?.Trim().ToLower()}_{item.InterviewDate?.ToString("yyyyMMdd")}";
                    if (seenKeys.Contains(key)) continue;
                    seenKeys.Add(key);
                    combined.Add(item);
                }

                if (string.Equals(metric, "unique_candidate", StringComparison.OrdinalIgnoreCase))
                    combined = InterviewRowStatusHelper.ApplyUniqueCandidateMetric(combined);

                var breakdown = combined
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

        private static readonly string ArchivesDir = Path.Combine(Directory.GetCurrentDirectory(), "Archives");

        private List<string> GetArchiveFilesToScan(DateTime? dateFrom, DateTime? dateTo)
        {
            var result = new List<string>();
            if (!Directory.Exists(ArchivesDir))
                return result;

            var allArchives = Directory.GetFiles(ArchivesDir, "Archive_*.xlsx");

            if (dateFrom.HasValue || dateTo.HasValue)
            {
                int yearFrom = dateFrom?.Year ?? (dateTo?.Year ?? DateTime.Today.Year);
                int yearTo   = dateTo?.Year   ?? (dateFrom?.Year ?? DateTime.Today.Year);

                for (int y = yearFrom; y <= yearTo; y++)
                {
                    var path = Path.Combine(ArchivesDir, $"Archive_{y}.xlsx");
                    if (System.IO.File.Exists(path))
                        result.Add(path);
                }
                return result;
            }

            result.AddRange(allArchives);
            return result;
        }

        private List<Interview> ReadArchiveInterviews(
            DateTime? dateFrom,
            DateTime? dateTo,
            string search,
            string company,
            string candidate,
            string status,
            string statuses,
            string stack)
        {
            var result = new List<Interview>();
            var archiveFiles = GetArchiveFilesToScan(dateFrom, dateTo);
            if (archiveFiles.Count == 0) return result;

            var statusSet = ParseStatusList(statuses);
            int fakeIdCounter = -1;

            foreach (var archivePath in archiveFiles)
            {
                try
                {
                    using var fs = new FileStream(archivePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                    using var wb = new XLWorkbook(fs);

                    var ws = wb.Worksheets.FirstOrDefault(w =>
                        w.Name.Equals("ArchivedInterviews", StringComparison.OrdinalIgnoreCase));
                    if (ws == null) continue;

                    var usedRows = ws.RowsUsed().ToList();
                    if (usedRows.Count <= 1) continue;

                    var headerRow = usedRows[0];
                    var headerMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                    int maxCol = headerRow.LastCellUsed()?.Address.ColumnNumber ?? 1;

                    for (int col = 1; col <= maxCol; col++)
                    {
                        var h = headerRow.Cell(col).GetString()?.Trim() ?? "";
                        if (!string.IsNullOrEmpty(h) && !headerMap.ContainsKey(h))
                            headerMap[h] = col;
                    }

                    int FindColLocal(string[] aliases)
                    {
                        foreach (var alias in aliases)
                        {
                            var normalized = SeedHelper.NormalizeHeaderForMatching(alias);
                            foreach (var kvp in headerMap)
                            {
                                if (SeedHelper.NormalizeHeaderForMatching(kvp.Key) == normalized)
                                    return kvp.Value;
                            }
                        }
                        return -1;
                    }

                    int creationDateCol = FindColLocal(SeedHelper.AliasMap["CreationDate"]);
                    int candidateCol    = FindColLocal(SeedHelper.AliasMap["IntervieweeName"]);
                    int companyCol      = FindColLocal(SeedHelper.AliasMap["CompanyName"]);
                    int srCol           = FindColLocal(SeedHelper.AliasMap["Sr"]);
                    int invToCol        = FindColLocal(SeedHelper.AliasMap["InvTo"]);
                    int interviewForCol = FindColLocal(SeedHelper.AliasMap["InterviewFor"]);
                    int jhCol           = FindColLocal(SeedHelper.AliasMap["JobHunterName"]);
                    int typeCol         = FindColLocal(SeedHelper.AliasMap["InterviewType"]);
                    int statusCol       = FindColLocal(SeedHelper.AliasMap["Status"]);
                    int startDateCol    = FindColLocal(SeedHelper.AliasMap["JobStartDate"]);
                    int closeDateCol    = FindColLocal(SeedHelper.AliasMap["JobCloseDate"]);
                    int interviewDateCol = FindColLocal(SeedHelper.AliasMap["InterviewDateTime"]);
                    int firstSalCol     = FindColLocal(SeedHelper.AliasMap["FirstSalary"]);
                    int jhSuggestCol    = FindColLocal(SeedHelper.AliasMap["JhSuggest"]);
                    int chargesCol      = FindColLocal(SeedHelper.AliasMap["InterviewCharges"]);
                    int jhDueCol        = FindColLocal(SeedHelper.AliasMap["JhDue"]);
                    int firstPayCol     = FindColLocal(SeedHelper.AliasMap["FirstPaymentOnJob"]);
                    int secondPayCol    = FindColLocal(SeedHelper.AliasMap["SecondPaymentOnJob"]);
                    int balPayCol       = FindColLocal(SeedHelper.AliasMap["BalancePayable"]);
                    int stackCol        = FindColLocal(new[] { "Stack Name", "StackName", "Stack" });

                    for (int i = 1; i < usedRows.Count; i++)
                    {
                        var row = usedRows[i];
                        if (row.IsEmpty()) continue;

                        string C(int col) => col > 0 ? row.Cell(col).GetString()?.Trim() ?? "" : "";

                        // Parse dates
                        var interviewDateStr = C(interviewDateCol);
                        DateTime? interviewDate = DateTime.TryParse(interviewDateStr, out var idp) ? idp : (DateTime?)null;

                        var startDateStr = C(startDateCol);
                        DateTime? startDate = DateTime.TryParse(startDateStr, out var sdp) ? sdp : (DateTime?)null;

                        var closeDateStr = C(closeDateCol);
                        DateTime? closeDate = DateTime.TryParse(closeDateStr, out var cdp) ? cdp : (DateTime?)null;

                        var creationDateStr = C(creationDateCol);
                        DateTime? creationDate = DateTime.TryParse(creationDateStr, out var cdt) ? cdt : (DateTime?)null;

                        // Date range filter: on job start date or interview date
                        if (dateFrom.HasValue)
                        {
                            var dfDate = dateFrom.Value.Date;
                            bool ok = (startDate != null && startDate >= dfDate) || (startDate == null && interviewDate != null && interviewDate >= dfDate);
                            if (!ok) continue;
                        }
                        if (dateTo.HasValue)
                        {
                            var dtEnd = dateTo.Value.Date.AddDays(1);
                            bool ok = (startDate != null && startDate < dtEnd) || (startDate == null && interviewDate != null && interviewDate < dtEnd);
                            if (!ok) continue;
                        }

                        // Company filter
                        var rowCompany = C(companyCol);
                        if (!string.IsNullOrEmpty(company) && company != "All" && !rowCompany.Equals(company, StringComparison.OrdinalIgnoreCase))
                            continue;

                        // Candidate filter
                        var rowCandidate = C(candidateCol);
                        if (!string.IsNullOrEmpty(candidate) && candidate != "All" && !rowCandidate.Equals(candidate, StringComparison.OrdinalIgnoreCase))
                            continue;

                        // Stack filter
                        var rowStack = C(stackCol);
                        if (!string.IsNullOrEmpty(stack) && stack != "All" && !rowStack.Equals(stack, StringComparison.OrdinalIgnoreCase))
                            continue;

                        // Status filter
                        var rowStatus = C(statusCol);
                        if (statusSet != null && statusSet.Count > 0)
                        {
                            // we'll filter this after creating the Interview object, using matches
                        }
                        else if (!string.IsNullOrEmpty(status) && status != "All")
                        {
                            if (status.Equals("Rescheduled", StringComparison.OrdinalIgnoreCase))
                            {
                                bool ok = rowStatus.Equals("Postponed", StringComparison.OrdinalIgnoreCase) || rowStatus.ToLower().Contains("resched");
                                if (!ok) continue;
                            }
                            else
                            {
                                if (!rowStatus.Equals(status, StringComparison.OrdinalIgnoreCase))
                                    continue;
                            }
                        }

                        // Search filter
                        if (!string.IsNullOrEmpty(search))
                        {
                            var s = search.ToLower();
                            var cand = rowCandidate.ToLower();
                            var comp = rowCompany.ToLower();
                            var ifor = C(interviewForCol).ToLower();
                            var jh   = C(jhCol).ToLower();
                            if (!cand.Contains(s) && !comp.Contains(s) && !ifor.Contains(s) && !jh.Contains(s))
                                continue;
                        }

                        decimal ParseDec(int col)
                        {
                            var s = C(col);
                            return decimal.TryParse(s, out var d) ? d : 0m;
                        }

                        var interview = new Interview
                        {
                            Id = fakeIdCounter--,
                            Sr = int.TryParse(C(srCol), out int sr) ? sr : (int?)null,
                            InvTo = C(invToCol),
                            InterviewFor = C(interviewForCol),
                            IntervieweeName = rowCandidate,
                            JobHunterName = C(jhCol),
                            CompanyName = rowCompany,
                            InterviewType = C(typeCol),
                            Status = rowStatus,
                            JobStartDate = startDate,
                            JobCloseDate = closeDate,
                            InterviewDate = interviewDate,
                            FirstSalary = C(firstSalCol),
                            JhSuggest = C(jhSuggestCol),
                            InterviewCharges = ParseDec(chargesCol),
                            JhDue = ParseDec(jhDueCol),
                            FirstPaymentOnJob = ParseDec(firstPayCol),
                            SecondPaymentOnJob = ParseDec(secondPayCol),
                            BalancePayable = ParseDec(balPayCol),
                            CreatedAt = creationDate ?? DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow,
                            LastSyncedAt = DateTime.UtcNow,
                            Stack = rowStack,
                            RawRowJson = "{}"
                        };

                        if (statusSet != null && statusSet.Count > 0 && !InterviewRowStatusHelper.MatchesAnyStatus(interview, statusSet))
                            continue;

                        result.Add(interview);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine("[InterviewsController] Failed to read archive file: " + ex.Message);
                }
            }

            return result;
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

        [HttpGet("job-hunter-names")]
        public IActionResult GetJobHunterNames()
        {
            try
            {
                var names = InterviewQuery
                    .Where(i => i.JobHunterName != null && i.JobHunterName != "")
                    .Select(i => i.JobHunterName.Trim())
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

        [HttpGet("inv-to-names")]
        public IActionResult GetInvToNames()
        {
            try
            {
                var names = InterviewQuery
                    .Where(i => i.InvTo != null && i.InvTo != "")
                    .Select(i => i.InvTo.Trim())
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

        [HttpGet("bd-dev-names")]
        public async Task<IActionResult> GetBdDevNames()
        {
            try
            {
                var conn = _context.Database.GetDbConnection();
                if (conn.State != System.Data.ConnectionState.Open)
                    await conn.OpenAsync();

                using var cmd = conn.CreateCommand();
                // Pull all unique BD names (insert_by from master = job hunter / BD)
                // and DEV names (insert_by from detail) with their role type
                cmd.CommandText = @"
                    SELECT DISTINCT
                        RTRIM(LTRIM(insert_by)) AS name,
                        'BD' AS type
                    FROM mkt.interview_master
                    WHERE insert_by IS NOT NULL
                      AND RTRIM(LTRIM(insert_by)) <> ''
                      AND RTRIM(LTRIM(insert_by)) <> 'Unassigned'

                    UNION

                    SELECT DISTINCT
                        RTRIM(LTRIM(insert_by)) AS name,
                        'DEV' AS type
                    FROM mkt.interview_detail
                    WHERE insert_by IS NOT NULL
                      AND RTRIM(LTRIM(insert_by)) <> ''
                      AND RTRIM(LTRIM(insert_by)) <> 'Unassigned'

                    UNION

                    SELECT DISTINCT
                        RTRIM(LTRIM(job_hunter_name)) AS name,
                        'BD' AS type
                    FROM dbo.Rizviz_Interviews_Live
                    WHERE job_hunter_name IS NOT NULL
                      AND RTRIM(LTRIM(job_hunter_name)) <> ''

                    ORDER BY type, name";

                var list = new List<object>();
                using var r = await cmd.ExecuteReaderAsync();
                while (await r.ReadAsync())
                {
                    list.Add(new
                    {
                        name = r["name"]?.ToString()?.Trim(),
                        type = r["type"]?.ToString()?.Trim()
                    });
                }
                return Ok(list);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("profile-owners")]
        public async Task<IActionResult> GetProfileOwners()
        {
            try
            {
                var conn = _context.Database.GetDbConnection();
                if (conn.State != System.Data.ConnectionState.Open)
                    await conn.OpenAsync();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"SELECT po.PrfOwn_code, po.profile_name, stk.stack_name
                                    FROM prof.Profile_Owners po
                                    LEFT JOIN setups.stacks stk ON po.stack_code = stk.stack_code
                                    WHERE po.profile_name IS NOT NULL AND RTRIM(po.profile_name) <> ''
                                    ORDER BY po.profile_name";

                var list = new List<object>();
                using var r = await cmd.ExecuteReaderAsync();
                while (await r.ReadAsync())
                {
                    list.Add(new
                    {
                        code = r["PrfOwn_code"],
                        name = r["profile_name"]?.ToString()?.Trim(),
                        stack = r["stack_name"]?.ToString()?.Trim()
                    });
                }
                return Ok(list);
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
        public async Task<IActionResult> SyncUploadedExcel(
            [FromForm] Microsoft.AspNetCore.Http.IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file uploaded." });

            var ext = Path.GetExtension(file.FileName)?.ToLowerInvariant();
            if (ext != ".xlsx" && ext != ".csv")
                return BadRequest(new { message = "Only Excel (.xlsx) and CSV (.csv) files are supported." });

            // resolvedFileDate: the actual date FROM the file content.
            // Stored on the session so the data gate uses file content date, not upload time.
            DateTime? resolvedFileDate = null;

            // ── Date check ────────────────────────────────────────────────────────
            // Priority order for file date:
            //   1. "Creation Date" column (earliest date across all data rows)
            //   2. FileKey sheet (B2 cell)
            //   3. workbook.Properties.Modified (Excel internal last-save timestamp)
            if (ext == ".xlsx")
            {
                try
                {
                    using var checkStream = file.OpenReadStream();
                    using var checkWb = new ClosedXML.Excel.XLWorkbook(checkStream);

                    // ── 1. Read "Creation Date" column from data rows ─────────────
                    DateTime? creationDateFromRows = null;
                    try
                    {
                        var dataWs = checkWb.Worksheets.FirstOrDefault(w =>
                                         w.Name.Contains("Interview", StringComparison.OrdinalIgnoreCase)) ??
                                     checkWb.Worksheets.FirstOrDefault(w =>
                                         !w.Name.Equals("FileKey", StringComparison.OrdinalIgnoreCase) &&
                                         !w.Name.Equals("Change_Log", StringComparison.OrdinalIgnoreCase)) ??
                                     checkWb.Worksheets.First();

                        var headerRow = dataWs.RowsUsed()
                            .FirstOrDefault(r => r.CellsUsed()
                                .Any(c => c.GetString().IndexOf("INTERVIEWEE", StringComparison.OrdinalIgnoreCase) >= 0));

                        if (headerRow != null)
                        {
                            int cdCol = -1;
                            for (int c = 1; c <= 60; c++)
                            {
                                var h = headerRow.Cell(c).GetString()?.ToLower().Trim() ?? "";
                                if (h == "creation date") { cdCol = c; break; }
                            }

                            if (cdCol > 0)
                            {
                                // Read all data rows and find the EARLIEST creation date
                                DateTime? earliest = null;
                                foreach (var row in dataWs.RowsUsed().Skip(headerRow.RowNumber()))
                                {
                                    var raw = row.Cell(cdCol).GetString()?.Trim();
                                    if (!string.IsNullOrWhiteSpace(raw) &&
                                        DateTime.TryParse(raw, out var d) && d.Year > 2000)
                                    {
                                        if (!earliest.HasValue || d.Date < earliest.Value.Date)
                                            earliest = d.Date;
                                    }
                                }
                                creationDateFromRows = earliest;
                            }
                        }
                    }
                    catch { /* non-fatal — fall through to other date sources */ }

                    // ── 2. FileKey sheet as secondary source ─────────────────────
                    DateTime? creationDateFromFileKey = null;
                    var fkSheet = checkWb.Worksheets.FirstOrDefault(
                        w => w.Name.Equals("FileKey", StringComparison.OrdinalIgnoreCase));
                    if (fkSheet != null)
                    {
                        var dateStr = fkSheet.Cell("B2").GetString();
                        if (DateTime.TryParse(dateStr, out var fkDate) && fkDate.Year > 2000)
                            creationDateFromFileKey = fkDate.Date;
                    }

                    // ── 3. workbook.Properties.Modified as last resort ────────────
                    DateTime? creationDateFromWb = null;
                    var wbMod = checkWb.Properties.Modified;
                    if (wbMod != default && wbMod.Year > 2000)
                        creationDateFromWb = wbMod.ToLocalTime().Date;

                    // Authoritative date: Creation Date column > FileKey sheet > workbook metadata
                    resolvedFileDate = creationDateFromRows ?? creationDateFromFileKey ?? creationDateFromWb;

                    // ── Gate decision ─────────────────────────────────────────────
                    if (!resolvedFileDate.HasValue)
                    {
                        // Couldn't determine file date — default to today and allow through
                        resolvedFileDate = DateTime.Today;
                    }
                }
                catch (Exception dateCheckEx)
                {
                    Console.WriteLine($"[SyncUpload] Date pre-check skipped: {dateCheckEx.Message}");
                    resolvedFileDate = DateTime.Today;
                }
            }

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
                    state.Interviews        = newInterviews;
                    state.HasUploaded       = true;
                    state.LastFileHash      = fileHash;
                    state.UploadedAt        = syncTime;
                    // Use file content date (resolvedFileDate) — NOT UploadedAt —
                    // so the today-gate compares against the date the file was MADE, not received.
                    state.UploadedFileDate  = resolvedFileDate?.Date ?? DateTime.Today;
                    state.IsBypassed        = (resolvedFileDate.HasValue && resolvedFileDate.Value.Date != DateTime.Today);
                    state.UploadedFileName  = file.FileName;

                    UpdateFileTracking(file.FileName, destPath, username);

                    var connectionId = Request.Headers["X-SignalR-Connection-Id"].ToString();
                    await _notificationService.NotifyFileReuploaded(connectionId);

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
                        state.Interviews       = newInterviews;
                        state.LastFileHash     = fileHash;
                        state.UploadedFileName = file.FileName;
                        // Keep UploadedFileDate in sync so the gate stays correct
                        state.UploadedFileDate = resolvedFileDate?.Date ?? DateTime.Today;
                        state.IsBypassed       = (resolvedFileDate.HasValue && resolvedFileDate.Value.Date != DateTime.Today);

                        // Copy to persistent path
                        var destPath = ResolvePersistentPath(file.FileName);
                        try
                        {
                            System.IO.File.Copy(tempPath, destPath, true);
                        }
                        catch {}

                        UpdateFileTracking(file.FileName, destPath, username);

                        // Clean up temp file
                        try { System.IO.File.Delete(tempPath); } catch {}

                        var connectionId = Request.Headers["X-SignalR-Connection-Id"].ToString();
                        await _notificationService.NotifyFileReuploaded(connectionId);

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
                    state.TempUploadedFileDate = resolvedFileDate?.Date ?? DateTime.Today;

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
        public async Task<IActionResult> ConfirmUploadedExcel()
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
                            UpdateFileTracking(state.TempUploadedFileName, destPath, state.Username ?? "Admin");
                        }
                        catch {}
                        try { System.IO.File.Delete(state.TempFilePath); } catch {}
                    }

                    state.UploadedFileName = state.TempUploadedFileName;
                    state.TempUploadedFileName = null;
                    state.TempFilePath = null;
                }

                if (state.TempUploadedFileDate.HasValue)
                {
                    state.UploadedFileDate = state.TempUploadedFileDate.Value;
                    state.IsBypassed = (state.UploadedFileDate.Value.Date != DateTime.Today);
                    state.TempUploadedFileDate = null;
                }

                SessionExcelManager.ClearTemp(sessionId);

                var connectionId = Request.Headers["X-SignalR-Connection-Id"].ToString();
                await _notificationService.NotifyFileReuploaded(connectionId);

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
            return Ok(new {
                hasUploaded = true,
                uploadedToday = true,
                uploadedAt = DateTime.UtcNow,
                fileName = "LiveDatabase",
                todayDate = DateTime.Today.ToString("yyyy-MM-dd")
            });
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

        [HttpGet("check-file-status")]
        public IActionResult CheckFileStatus()
        {
            try
            {
                var filePath = ResolveSourcePath();
                if (string.IsNullOrEmpty(filePath) || !System.IO.File.Exists(filePath))
                {
                    return Ok(new 
                    { 
                        changed = false, 
                        note = "Source Excel file does not exist on disk.",
                        lastUploadedAt = (DateTime?)null,
                        lastUploadedBy = (string)null
                    });
                }

                var tracking = _context.FileTrackings.OrderByDescending(f => f.LastUploadedAt).FirstOrDefault();

                if (tracking == null)
                {
                    var baselineHash = ComputeSHA256(filePath);
                    if (!string.IsNullOrEmpty(baselineHash))
                    {
                        tracking = new FileTracking
                        {
                            FileName = Path.GetFileName(filePath),
                            LastUploadedHash = baselineHash,
                            LastUploadedAt = DateTime.UtcNow,
                            LastUploadedBy = "System (Auto-seeded Baseline)"
                        };
                        _context.FileTrackings.Add(tracking);
                        _context.SaveChanges();
                    }

                    return Ok(new 
                    { 
                        changed = false, 
                        note = "No file tracking record found. Seeded current file on disk as baseline.",
                        lastUploadedAt = tracking?.LastUploadedAt,
                        lastUploadedBy = tracking?.LastUploadedBy
                    });
                }

                var currentHash = ComputeSHA256(filePath);
                bool isChanged = !string.Equals(currentHash, tracking.LastUploadedHash, StringComparison.OrdinalIgnoreCase);

                return Ok(new
                {
                    changed = isChanged,
                    lastUploadedAt = tracking.LastUploadedAt,
                    lastUploadedBy = tracking.LastUploadedBy,
                    fileName = tracking.FileName
                });
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
        public IActionResult GetStats([FromQuery] string candidate = null)
        {
            try
            {
                var all = InterviewQuery.ToList();

                // If a candidate filter is provided, restrict stats to that candidate only
                if (!string.IsNullOrWhiteSpace(candidate) && candidate != "All")
                {
                    var candidateLower = candidate.Trim().ToLowerInvariant();
                    all = all.Where(i =>
                        (i.IntervieweeName != null && i.IntervieweeName.Trim().ToLowerInvariant().Contains(candidateLower))
                    ).ToList();
                }

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

        [HttpGet("monthly-trend")]
        public IActionResult GetMonthlyTrend()
        {
            try
            {
                var currentYear = DateTime.Today.Year;
                var all = InterviewQuery
                    .Where(i => i.InterviewDate.HasValue && i.InterviewDate.Value.Year == currentYear)
                    .ToList();

                // Build a full 12-month scaffold so every month appears even if count = 0
                var monthNames = new[] { "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec" };
                var grouped = all
                    .GroupBy(i => i.InterviewDate!.Value.Month)
                    .ToDictionary(g => g.Key, g => g.Count());

                var trend = Enumerable.Range(1, 12)
                    .Select(m => new { month = monthNames[m - 1], count = grouped.TryGetValue(m, out var c) ? c : 0 })
                    .ToList();

                return Ok(new { trend });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("sync-mkt")]
        public IActionResult SyncMktInterviews()
        {
            try
            {
                var updateSql = @"
UPDATE r
SET 
    r.stack = COALESCE(NULLIF(r.stack, ''), stk.stack_name, 'DevOps'),
    r.raw_row_json = COALESCE(r.raw_row_json, (
        SELECT 
            d.interview_code,
            d.interview_seq_code,
            d.intv_status,
            d.intv_datetime,
            d.intv_type,
            d.call_code,
            d.BD_feedback,
            d.Dev_feedback,
            d.barriers,
            d.dept_code,
            d.team_code,
            d.stack_code,
            d.insert_by,
            d.Notes,
            d.meeting_link,
            d.JD,
            d.resume_file_name
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    ))
FROM dbo.Rizviz_Interviews r
JOIN mkt.interview_detail d ON r.sr = d.interview_seq_code
LEFT JOIN mkt.interview_master m ON d.interview_code = m.interview_code
LEFT JOIN setups.stacks stk ON stk.stack_code = COALESCE(d.stack_code, m.stack_code);";
                _context.Database.ExecuteSqlRaw(updateSql);

                var insertSql = @"
INSERT INTO dbo.Rizviz_Interviews (
    sr, inv_to, interview_date, interview_for, interviewee_name, job_hunter_name, company_name, interview_type,
    job_start_date, job_close_date, first_salary, jh_suggest, interview_charges, jh_due, first_payment_on_job,
    second_payment_on_job, balance_payable, interview_code, status, stack, created_at, updated_at, last_synced_at, raw_row_json
)
SELECT 
    d.interview_seq_code AS sr,
    CASE WHEN m.interview_to = 1 THEN 'TGS' WHEN m.interview_to = 2 THEN 'Silmun' ELSE ISNULL(CAST(m.interview_to AS nvarchar(100)), 'Silmun') END AS inv_to,
    CAST(d.intv_datetime AS date) AS interview_date,
    COALESCE(NULLIF(RTRIM(m.position), ''), NULLIF(RTRIM(ent.full_name), ''), NULLIF(RTRIM(ent.first_name), ''), CAST(m.lead_code AS nvarchar(255)), 'General') AS interview_for,
    COALESCE(NULLIF(RTRIM(m.recruiter_name), ''), NULLIF(RTRIM(ent.full_name), ''), NULLIF(RTRIM(d.insert_by), ''), 'Candidate') AS interviewee_name,
    ISNULL(NULLIF(RTRIM(m.insert_by), ''), NULLIF(RTRIM(d.insert_by), 'Unassigned')) AS job_hunter_name,
    ISNULL(NULLIF(RTRIM(m.company_name), ''), 'Unknown') AS company_name,
    CASE RTRIM(ISNULL(d.intv_type, ''))
        WHEN 'T' THEN 'Technical' WHEN 'S' THEN 'Screening' WHEN 'N' THEN 'Non-Technical' WHEN 'D' THEN 'Demo' WHEN '' THEN 'Technical' ELSE RTRIM(d.intv_type)
    END AS interview_type,
    CAST(d.intv_datetime AS date) AS job_start_date,
    CAST(m.Job_landed_date AS date) AS job_close_date,
    '' AS first_salary, '' AS jh_suggest, 0 AS interview_charges, 0 AS jh_due, 0 AS first_payment_on_job,
    0 AS second_payment_on_job, 0 AS balance_payable,
    CONCAT('INT-', d.interview_code, '-', d.interview_seq_code) AS interview_code,
    CASE 
        WHEN RTRIM(ISNULL(m.Overall_sts, '')) = 'Y' THEN 'converted'
        WHEN RTRIM(ISNULL(m.Overall_sts, '')) = 'N' THEN 'rejected'
        WHEN RTRIM(ISNULL(d.intv_status, '')) = 'P' THEN 'Scheduled'
        WHEN RTRIM(ISNULL(d.intv_status, '')) = 'S' THEN 'Scheduled'
        ELSE 'Scheduled'
    END AS status,
    ISNULL(stk.stack_name, 'DevOps') AS stack,
    ISNULL(d.insert_time, GETUTCDATE()) AS created_at,
    ISNULL(d.insert_time, GETUTCDATE()) AS updated_at,
    GETUTCDATE() AS last_synced_at,
    (
        SELECT 
            d.interview_code, d.interview_seq_code, d.intv_status, d.intv_datetime, d.intv_type, d.call_code,
            d.BD_feedback, d.Dev_feedback, d.barriers, d.dept_code, d.team_code, d.stack_code, d.insert_by,
            d.Notes, d.meeting_link, d.JD, d.resume_file_name
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    ) AS raw_row_json
FROM mkt.interview_detail d
LEFT JOIN mkt.interview_master m ON d.interview_code = m.interview_code
LEFT JOIN hrms.entity ent ON m.entity_code = ent.entity_code
LEFT JOIN setups.stacks stk ON stk.stack_code = COALESCE(d.stack_code, m.stack_code)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Rizviz_Interviews r 
    WHERE r.interview_code = CONCAT('INT-', d.interview_code, '-', d.interview_seq_code)
       OR r.sr = d.interview_seq_code
);";
                int inserted = _context.Database.ExecuteSqlRaw(insertSql);
                int total = _context.Interviews.Count();
                return Ok(new { inserted, total, message = $"Synced successfully. Total interviews in database: {total}" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        private static void AddParam(DbCommand cmd, string name, object value)
        {
            var p = cmd.CreateParameter();
            p.ParameterName = name;
            p.Value = value ?? DBNull.Value;
            cmd.Parameters.Add(p);
        }

        private async Task<IActionResult> UpdateLiveInterviewAsync(int id, Interview updatedData, User user)
        {
            try
            {
                int seqCode = id >= 5000000 ? id - 5000000 : id;
                var existing = await _context.Interviews.AsNoTracking().FirstOrDefaultAsync(i => i.Id == id);
                if (existing == null)
                    return NotFound(new { message = $"Interview {id} not found." });

                var oldInterview = new Interview
                {
                    Status = existing.Status,
                    CompanyName = existing.CompanyName,
                    IntervieweeName = existing.IntervieweeName,
                    JobHunterName = existing.JobHunterName
                };

                // Status mapping
                string statusVal = null;
                if (!string.IsNullOrWhiteSpace(updatedData.Status))
                {
                    string s = updatedData.Status.Trim();
                    statusVal = s.ToUpper() switch
                    {
                        "SCHEDULED" => "S",
                        "COMPLETED" => "C",
                        "CANCELLED" => "X",
                        "PENDING" => "P",
                        "REJECTED" => "R",
                        "HIRED" => "H",
                        "CONVERTED" => "C",
                        "DROPPED" => "X",
                        "POSTPONED" => "P",
                        "CLOSED" => "C",
                        "DEAD" => "X",
                        _ => s.Length > 20 ? s.Substring(0, 20) : s
                    };
                }

                // Stack mapping
                int? stackCode = null;
                if (!string.IsNullOrWhiteSpace(updatedData.Stack))
                {
                    string stk = updatedData.Stack.Trim().ToLower();
                    stackCode = stk switch
                    {
                        "salesforce" => 1,
                        "servicenow" => 2,
                        "msdynamics" => 3,
                        "dataengineering" => 4,
                        "powerbuilder" => 5,
                        "devops" => 6,
                        "ai/python" or "python" or "ai" => 7,
                        _ => null
                    };
                }

                // Interview Type mapping
                string typeVal = null;
                if (!string.IsNullOrWhiteSpace(updatedData.InterviewType))
                {
                    string t = updatedData.InterviewType.Trim();
                    typeVal = t.ToLower() switch
                    {
                        "technical" => "T",
                        "screening" => "S",
                        "non-technical" => "N",
                        "demo" => "D",
                        "interview" => "",
                        _ => t.Length > 50 ? t.Substring(0, 50) : t
                    };
                }

                // InvTo mapping
                int? invToVal = null;
                if (!string.IsNullOrWhiteSpace(updatedData.InvTo))
                {
                    string inv = updatedData.InvTo.Trim().ToUpper();
                    if (inv == "TGS") invToVal = 1;
                    else if (inv == "SILMUN") invToVal = 2;
                    else if (int.TryParse(inv, out int parsed)) invToVal = parsed;
                }

                DateTime? intvDate = updatedData.InterviewDate ?? updatedData.JobStartDate;
                DateTime? jobCloseDate = updatedData.JobCloseDate;
                string compName = updatedData.CompanyName?.Trim();
                string intervieweeName = updatedData.IntervieweeName?.Trim();

                var conn = _context.Database.GetDbConnection();
                if (conn.State != System.Data.ConnectionState.Open)
                {
                    await conn.OpenAsync();
                }

                using (var cmd = conn.CreateCommand())
                {
                    // 1. Update mkt.interview_detail
                    var detailSets = new List<string>();
                    if (statusVal != null) { detailSets.Add("intv_status = @intv_status"); AddParam(cmd, "@intv_status", statusVal); }
                    if (intvDate.HasValue) { detailSets.Add("intv_datetime = @intv_datetime"); AddParam(cmd, "@intv_datetime", intvDate.Value); }
                    if (typeVal != null) { detailSets.Add("intv_type = @intv_type"); AddParam(cmd, "@intv_type", typeVal); }
                    if (stackCode.HasValue) { detailSets.Add("stack_code = @stack_code"); AddParam(cmd, "@stack_code", stackCode.Value); }
                    if (!string.IsNullOrWhiteSpace(updatedData.TimeZone)) { detailSets.Add("time_Zone = @time_zone"); AddParam(cmd, "@time_zone", updatedData.TimeZone.Trim()); }
                    if (updatedData.ClientFeedback != null) { detailSets.Add("BD_feedback = @client_feedback"); AddParam(cmd, "@client_feedback", updatedData.ClientFeedback.Trim()); }
                    if (updatedData.MeetingLink != null) { detailSets.Add("meeting_link = @meeting_link"); AddParam(cmd, "@meeting_link", updatedData.MeetingLink.Trim()); }

                    if (detailSets.Count > 0)
                    {
                        cmd.CommandText = $"UPDATE mkt.interview_detail SET {string.Join(", ", detailSets)} WHERE interview_seq_code = @seqCode";
                        AddParam(cmd, "@seqCode", seqCode);
                        await cmd.ExecuteNonQueryAsync();
                    }

                    // 2. Update mkt.interview_master
                    cmd.Parameters.Clear();
                    var masterSets = new List<string>();
                    if (!string.IsNullOrWhiteSpace(compName)) { masterSets.Add("company_name = @company_name"); AddParam(cmd, "@company_name", compName); }
                    if (!string.IsNullOrWhiteSpace(intervieweeName)) { masterSets.Add("recruiter_name = @recruiter_name"); AddParam(cmd, "@recruiter_name", intervieweeName); }
                    if (invToVal.HasValue) { masterSets.Add("interview_to = @interview_to"); AddParam(cmd, "@interview_to", invToVal.Value); }
                    if (jobCloseDate.HasValue || updatedData.JobLandedDate.HasValue) { masterSets.Add("Job_landed_date = @Job_landed_date"); AddParam(cmd, "@Job_landed_date", updatedData.JobLandedDate ?? jobCloseDate); }
                    if (!string.IsNullOrWhiteSpace(updatedData.DirectSelf)) { masterSets.Add("direct_self = @direct_self"); AddParam(cmd, "@direct_self", updatedData.DirectSelf.Trim()); }
                    if (updatedData.StaffingFirm != null) { masterSets.Add("staffing_firm = @staffing_firm"); AddParam(cmd, "@staffing_firm", updatedData.StaffingFirm.Trim()); }
                    if (updatedData.ImplementationPartner != null) { masterSets.Add("implementation_partner = @implem_partner"); AddParam(cmd, "@implem_partner", updatedData.ImplementationPartner.Trim()); }
                    if (updatedData.PayscaleVal.HasValue) { masterSets.Add("payscale_val = @payscale_val"); AddParam(cmd, "@payscale_val", updatedData.PayscaleVal.Value); }
                    if (!string.IsNullOrWhiteSpace(updatedData.PayscaleUnit)) { masterSets.Add("payscale_unit = @payscale_unit"); AddParam(cmd, "@payscale_unit", updatedData.PayscaleUnit.Trim()); }
                    if (updatedData.JobReference != null) { masterSets.Add("job_reference = @job_reference"); AddParam(cmd, "@job_reference", updatedData.JobReference.Trim()); }
                    if (updatedData.RejectionReason != null) { masterSets.Add("rejection_reason = @rejection_reason"); AddParam(cmd, "@rejection_reason", updatedData.RejectionReason.Trim()); }
                    if (updatedData.Remarks != null) { masterSets.Add("remarks = @remarks"); AddParam(cmd, "@remarks", updatedData.Remarks.Trim()); }

                    if (masterSets.Count > 0)
                    {
                        cmd.CommandText = $"UPDATE mkt.interview_master SET {string.Join(", ", masterSets)} WHERE interview_code = (SELECT interview_code FROM mkt.interview_detail WHERE interview_seq_code = @seqCode)";
                        AddParam(cmd, "@seqCode", seqCode);
                        await cmd.ExecuteNonQueryAsync();
                    }
                }

                // Invalidate or reload
                var fresh = await _context.Interviews.AsNoTracking().FirstOrDefaultAsync(i => i.Id == id) ?? existing;

                if (_notificationService != null)
                {
                    try { await _notificationService.BroadcastInterviewChange(oldInterview, fresh, user?.Username ?? "User"); } catch {}
                }

                return Ok(fresh);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Database save failed: " + ex.Message });
            }
        }

        private async Task<IActionResult> CreateLiveInterviewAsync(Interview interview, User user)
        {
            try
            {
                string statusVal = "S";
                if (!string.IsNullOrWhiteSpace(interview.Status))
                {
                    string s = interview.Status.Trim();
                    statusVal = s.ToUpper() switch
                    {
                        "SCHEDULED" => "S",
                        "COMPLETED" => "C",
                        "CANCELLED" => "X",
                        "PENDING" => "P",
                        "REJECTED" => "R",
                        "HIRED" => "H",
                        _ => "S"
                    };
                }

                int? stackCode = null;
                if (!string.IsNullOrWhiteSpace(interview.Stack))
                {
                    string stk = interview.Stack.Trim().ToLower();
                    stackCode = stk switch
                    {
                        "salesforce" => 1,
                        "servicenow" => 2,
                        "msdynamics" => 3,
                        "dataengineering" => 4,
                        "powerbuilder" => 5,
                        "devops" => 6,
                        "ai/python" or "python" or "ai" => 7,
                        _ => null
                    };
                }

                string typeVal = "T";
                if (!string.IsNullOrWhiteSpace(interview.InterviewType))
                {
                    string t = interview.InterviewType.Trim().ToLower();
                    typeVal = t switch
                    {
                        "technical" => "T",
                        "screening" => "S",
                        "non-technical" => "N",
                        "demo" => "D",
                        _ => "T"
                    };
                }

                int invToVal = 1;
                if (!string.IsNullOrWhiteSpace(interview.InvTo))
                {
                    string inv = interview.InvTo.Trim().ToUpper();
                    if (inv == "SILMUN") invToVal = 2;
                    else if (int.TryParse(inv, out int parsed)) invToVal = parsed;
                }

                DateTime intvDate = interview.InterviewDate ?? interview.JobStartDate ?? DateTime.UtcNow;
                string compName = string.IsNullOrWhiteSpace(interview.CompanyName) ? "Unknown" : interview.CompanyName.Trim();
                string intervieweeName = string.IsNullOrWhiteSpace(interview.IntervieweeName) ? (user?.Username ?? "Unassigned") : interview.IntervieweeName.Trim();
                string insertBy = user?.Username ?? "Admin";
                if (insertBy.Length > 20) insertBy = insertBy.Substring(0, 20);

                int newSeqCode = 0;
                var conn = _context.Database.GetDbConnection();
                if (conn.State != System.Data.ConnectionState.Open)
                {
                    await conn.OpenAsync();
                }

                using (var cmd = conn.CreateCommand())
                {
                    int? prfOwnCode = null;
                    if (!string.IsNullOrWhiteSpace(interview.InterviewFor))
                    {
                        cmd.CommandText = "SELECT TOP 1 PrfOwn_code FROM prof.Profile_Owners WHERE profile_name = @pName OR RTRIM(profile_name) = @pName";
                        cmd.Parameters.Clear();
                        AddParam(cmd, "@pName", interview.InterviewFor.Trim());
                        var pObj = await cmd.ExecuteScalarAsync();
                        if (pObj != null && pObj != DBNull.Value)
                            prfOwnCode = Convert.ToInt32(pObj);
                    }

                    cmd.CommandText = "SELECT ISNULL(MAX(interview_code), 0) + 1 FROM mkt.interview_master";
                    cmd.Parameters.Clear();
                    int newIntCode = Convert.ToInt32(await cmd.ExecuteScalarAsync());

                    cmd.CommandText = "SELECT ISNULL(MAX(interview_seq_code), 0) + 1 FROM mkt.interview_detail";
                    newSeqCode = Convert.ToInt32(await cmd.ExecuteScalarAsync());

                    cmd.Parameters.Clear();
                    cmd.CommandText = @"INSERT INTO mkt.interview_master 
                        (interview_code, company_name, recruiter_name, interview_to, PrfOwn_code, direct_self, staffing_firm, implementation_partner, payscale_val, payscale_unit, job_reference, rejection_reason, remarks, Job_landed_date, insert_by, insert_time)
                        VALUES (@code, @comp, @recruiter, @invTo, @prfOwn, @directSelf, @staffingFirm, @implemPartner, @payscaleVal, @payscaleUnit, @jobRef, @rejectReason, @remarks, @jobDate, @by, GETUTCDATE())";
                    AddParam(cmd, "@code", newIntCode);
                    AddParam(cmd, "@comp", compName);
                    AddParam(cmd, "@recruiter", string.IsNullOrWhiteSpace(interview.RecruiterName) ? intervieweeName : interview.RecruiterName.Trim());
                    AddParam(cmd, "@invTo", invToVal);
                    AddParam(cmd, "@prfOwn", (object)prfOwnCode ?? DBNull.Value);
                    AddParam(cmd, "@directSelf", string.IsNullOrWhiteSpace(interview.DirectSelf) ? "Self" : interview.DirectSelf.Trim());
                    AddParam(cmd, "@staffingFirm", (object)interview.StaffingFirm ?? DBNull.Value);
                    AddParam(cmd, "@implemPartner", (object)interview.ImplementationPartner ?? DBNull.Value);
                    AddParam(cmd, "@payscaleVal", (object)interview.PayscaleVal ?? DBNull.Value);
                    AddParam(cmd, "@payscaleUnit", string.IsNullOrWhiteSpace(interview.PayscaleUnit) ? "/yr" : interview.PayscaleUnit.Trim());
                    AddParam(cmd, "@jobRef", (object)interview.JobReference ?? DBNull.Value);
                    AddParam(cmd, "@rejectReason", (object)interview.RejectionReason ?? DBNull.Value);
                    AddParam(cmd, "@remarks", (object)interview.Remarks ?? DBNull.Value);
                    AddParam(cmd, "@jobDate", (object)interview.JobLandedDate ?? (object)interview.JobCloseDate ?? DBNull.Value);
                    AddParam(cmd, "@by", insertBy);
                    await cmd.ExecuteNonQueryAsync();

                    cmd.Parameters.Clear();
                    cmd.CommandText = @"INSERT INTO mkt.interview_detail 
                        (interview_code, interview_seq_code, intv_status, intv_datetime, intv_type, stack_code, time_Zone, BD_feedback, meeting_link, insert_by, insert_time)
                        VALUES (@code, @seqCode, @status, @dt, @type, @stack, @timeZone, @feedback, @meetingLink, @by, GETUTCDATE())";
                    AddParam(cmd, "@code", newIntCode);
                    AddParam(cmd, "@seqCode", newSeqCode);
                    AddParam(cmd, "@status", statusVal);
                    AddParam(cmd, "@dt", intvDate);
                    AddParam(cmd, "@type", typeVal);
                    AddParam(cmd, "@stack", stackCode);
                    AddParam(cmd, "@timeZone", string.IsNullOrWhiteSpace(interview.TimeZone) ? "EST" : interview.TimeZone.Trim());
                    AddParam(cmd, "@feedback", (object)interview.ClientFeedback ?? DBNull.Value);
                    AddParam(cmd, "@meetingLink", (object)interview.MeetingLink ?? DBNull.Value);
                    AddParam(cmd, "@by", insertBy);
                    await cmd.ExecuteNonQueryAsync();
                }

                interview.Id = newSeqCode;
                interview.Sr = newSeqCode;

                if (_notificationService != null)
                {
                    try { await _notificationService.BroadcastNewInterview(interview, user?.Username ?? "User"); } catch {}
                }

                return Ok(interview);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Database insert failed: " + ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateInterview([FromBody] Interview interview)
        {
            var user = GetCurrentUser();

            if (IsLiveUatReadOnly)
            {
                return await CreateLiveInterviewAsync(interview, user);
            }

            try
            {
                interview.Id = 0;
                interview.CreatedAt = DateTime.UtcNow;
                interview.UpdatedAt = DateTime.UtcNow;
                if (string.IsNullOrWhiteSpace(interview.Status))
                    interview.Status = "Scheduled";

                _context.Interviews.Add(interview);
                _context.SaveChanges();

                // Broadcast live notification
                if (_notificationService != null)
                {
                    try { await _notificationService.BroadcastNewInterview(interview, user?.Username ?? "User"); } catch {}
                }

                return Ok(interview);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("{id:int}")]
        public IActionResult GetInterviewById(int id)
        {
            try
            {
                var interview = _context.Interviews.Find(id);
                if (interview == null)
                    return NotFound(new { message = $"Interview {id} not found." });

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
            var user = GetCurrentUser();

            if (IsLiveUatReadOnly)
            {
                return await UpdateLiveInterviewAsync(id, updatedData, user);
            }
            
            try
            {
                var existing = _context.Interviews.Find(id);
                if (existing == null) return NotFound(new { message = "Interview not found" });

                // Clone existing for notification delta detection
                var oldInterview = new Interview
                {
                    Status = existing.Status,
                    CompanyName = existing.CompanyName,
                    IntervieweeName = existing.IntervieweeName,
                    JobHunterName = existing.JobHunterName
                };

                existing.Sr = updatedData.Sr;
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
                existing.Status = string.IsNullOrWhiteSpace(updatedData.Status) ? existing.Status : updatedData.Status;
                existing.Stack = updatedData.Stack;
                existing.UpdatedAt = DateTime.UtcNow;

                // Log and write back to Excel if available
                try { InterviewExcelWriter.UpdateRowAndLog(existing, updatedData, user?.Username ?? "User"); } catch {}

                _context.SaveChanges();

                // Broadcast live notification
                if (_notificationService != null)
                {
                    try { await _notificationService.BroadcastInterviewChange(oldInterview, existing, user?.Username ?? "User"); } catch {}
                }

                return Ok(existing);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPatch("{id:int}")]
        public async Task<IActionResult> PatchInterview(int id, [FromBody] InterviewPatchDto patch)
        {
            var user = GetCurrentUser();

            if (IsLiveUatReadOnly)
            {
                var model = new Interview
                {
                    Sr = patch.Sr ?? 0,
                    InvTo = patch.InvTo,
                    InterviewDate = patch.InterviewDate,
                    InterviewFor = patch.InterviewFor,
                    IntervieweeName = patch.IntervieweeName,
                    JobHunterName = patch.JobHunterName,
                    CompanyName = patch.CompanyName,
                    InterviewType = patch.InterviewType,
                    JobStartDate = patch.JobStartDate,
                    JobCloseDate = patch.JobCloseDate,
                    FirstSalary = patch.FirstSalary,
                    JhSuggest = patch.JhSuggest,
                    InterviewCharges = patch.InterviewCharges ?? 0,
                    JhDue = patch.JhDue ?? 0,
                    FirstPaymentOnJob = patch.FirstPaymentOnJob ?? 0,
                    SecondPaymentOnJob = patch.SecondPaymentOnJob ?? 0,
                    BalancePayable = patch.BalancePayable ?? 0,
                    Status = patch.Status,
                    Stack = patch.Stack
                };
                return await UpdateLiveInterviewAsync(id, model, user);
            }

            try
            {
                var existing = _context.Interviews.Find(id);
                if (existing == null) return NotFound(new { message = "Interview not found" });

                var oldInterview = new Interview
                {
                    Status = existing.Status,
                    CompanyName = existing.CompanyName,
                    IntervieweeName = existing.IntervieweeName,
                    JobHunterName = existing.JobHunterName
                };

                if (patch.Sr.HasValue) existing.Sr = patch.Sr.Value;
                if (patch.InvTo != null) existing.InvTo = patch.InvTo;
                if (patch.InterviewDate.HasValue) existing.InterviewDate = patch.InterviewDate.Value;
                if (patch.InterviewFor != null) existing.InterviewFor = patch.InterviewFor;
                if (patch.IntervieweeName != null) existing.IntervieweeName = patch.IntervieweeName;
                if (patch.JobHunterName != null) existing.JobHunterName = patch.JobHunterName;
                if (patch.CompanyName != null) existing.CompanyName = patch.CompanyName;
                if (patch.InterviewType != null) existing.InterviewType = patch.InterviewType;
                if (patch.JobStartDate.HasValue) existing.JobStartDate = patch.JobStartDate.Value;
                if (patch.JobCloseDate.HasValue) existing.JobCloseDate = patch.JobCloseDate.Value;
                if (patch.FirstSalary != null) existing.FirstSalary = patch.FirstSalary;
                if (patch.JhSuggest != null) existing.JhSuggest = patch.JhSuggest;
                if (patch.InterviewCharges.HasValue) existing.InterviewCharges = patch.InterviewCharges.Value;
                if (patch.JhDue.HasValue) existing.JhDue = patch.JhDue.Value;
                if (patch.FirstPaymentOnJob.HasValue) existing.FirstPaymentOnJob = patch.FirstPaymentOnJob.Value;
                if (patch.SecondPaymentOnJob.HasValue) existing.SecondPaymentOnJob = patch.SecondPaymentOnJob.Value;
                if (patch.BalancePayable.HasValue) existing.BalancePayable = patch.BalancePayable.Value;
                if (!string.IsNullOrWhiteSpace(patch.Status)) existing.Status = patch.Status;
                if (patch.Stack != null) existing.Stack = patch.Stack;
                existing.UpdatedAt = DateTime.UtcNow;

                _context.SaveChanges();

                if (_notificationService != null)
                {
                    try { await _notificationService.BroadcastInterviewChange(oldInterview, existing, user?.Username ?? "User"); } catch {}
                }

                return Ok(existing);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteInterview(int id)
        {
            try
            {
                int seqCode = id >= 5000000 ? id - 5000000 : id;
                var conn = _context.Database.GetDbConnection();
                if (conn.State != System.Data.ConnectionState.Open)
                {
                    await conn.OpenAsync();
                }

                // 1. Get interview details before deleting (for Excel cleanup & SignalR broadcast)
                int? intCode = null;
                Interview oldInterview = null;

                try
                {
                    oldInterview = await _context.Interviews.AsNoTracking().FirstOrDefaultAsync(i => i.Id == id);
                }
                catch {}

                using (var getCmd = conn.CreateCommand())
                {
                    getCmd.CommandText = "SELECT interview_code FROM mkt.interview_detail WHERE interview_seq_code = @seqCode";
                    AddParam(getCmd, "@seqCode", seqCode);
                    var obj = await getCmd.ExecuteScalarAsync();
                    if (obj != null && obj != DBNull.Value)
                    {
                        intCode = Convert.ToInt32(obj);
                    }
                }

                // 2. Delete any stakeholders referencing this interview_seq_code
                try
                {
                    using var delStk = conn.CreateCommand();
                    delStk.CommandText = "DELETE FROM mkt.interview_stakeholders WHERE interview_seq_code = @seqCode";
                    AddParam(delStk, "@seqCode", seqCode);
                    await delStk.ExecuteNonQueryAsync();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[DeleteInterview] Could not delete stakeholders for seq {seqCode}: {ex.Message}");
                }

                // 3. Delete from mkt.interview_detail (Permanently removes row from database)
                int rowsDeleted = 0;
                using (var delDetail = conn.CreateCommand())
                {
                    delDetail.CommandText = "DELETE FROM mkt.interview_detail WHERE interview_seq_code = @seqCode";
                    AddParam(delDetail, "@seqCode", seqCode);
                    rowsDeleted = await delDetail.ExecuteNonQueryAsync();
                }

                // 4. If master has no remaining detail records, clean up interview_master too
                if (intCode.HasValue)
                {
                    try
                    {
                        using var checkCmd = conn.CreateCommand();
                        checkCmd.CommandText = "SELECT COUNT(*) FROM mkt.interview_detail WHERE interview_code = @code";
                        AddParam(checkCmd, "@code", intCode.Value);
                        var remaining = Convert.ToInt32(await checkCmd.ExecuteScalarAsync());
                        if (remaining == 0)
                        {
                            try
                            {
                                using var delMasterStk = conn.CreateCommand();
                                delMasterStk.CommandText = "DELETE FROM mkt.interview_stakeholders WHERE interview_code = @code";
                                AddParam(delMasterStk, "@code", intCode.Value);
                                await delMasterStk.ExecuteNonQueryAsync();
                            }
                            catch {}

                            try
                            {
                                using var delCharg = conn.CreateCommand();
                                delCharg.CommandText = "DELETE FROM mkt.interview_chargibility WHERE interview_code = @code";
                                AddParam(delCharg, "@code", intCode.Value);
                                await delCharg.ExecuteNonQueryAsync();
                            }
                            catch {}

                            try
                            {
                                using var delMaster = conn.CreateCommand();
                                delMaster.CommandText = "DELETE FROM mkt.interview_master WHERE interview_code = @code";
                                AddParam(delMaster, "@code", intCode.Value);
                                await delMaster.ExecuteNonQueryAsync();
                            }
                            catch {}
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[DeleteInterview] Could not clean up interview_master {intCode}: {ex.Message}");
                    }
                }

                // 5. Also clean up from dbo.Rizviz_Interviews table (if exists in synced local storage)
                try
                {
                    using var delRz = conn.CreateCommand();
                    delRz.CommandText = "DELETE FROM dbo.Rizviz_Interviews WHERE id = @id OR sr = @id OR id = @seqCode";
                    AddParam(delRz, "@id", id);
                    AddParam(delRz, "@seqCode", seqCode);
                    await delRz.ExecuteNonQueryAsync();
                }
                catch {}

                // 6. If local EF table is mapped and record exists, remove it
                try
                {
                    if (!IsLiveUatReadOnly)
                    {
                        var local = _context.Interviews.Find(id);
                        if (local != null)
                        {
                            _context.Interviews.Remove(local);
                            _context.SaveChanges();
                        }
                    }
                }
                catch {}

                // 7. Delete from Excel if synced
                if (oldInterview?.Sr != null)
                {
                    var user = GetCurrentUser();
                    InterviewExcelWriter.DeleteRowFromExcel(oldInterview.Sr, user?.Username ?? "User");
                }

                // 8. Broadcast via SignalR
                if (_notificationService != null && oldInterview != null)
                {
                    try
                    {
                        var user = GetCurrentUser();
                        await _notificationService.BroadcastInterviewChange(oldInterview, null, user?.Username ?? "User");
                    }
                    catch {}
                }

                return Ok(new { success = true, id, message = "Interview deleted from database successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Database delete failed: " + ex.Message });
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
                    if (DateTime.TryParse(month + "-01", out var date))
                    {
                        var nextMonth = date.AddMonths(1);
                        query = query.Where(i =>
                            (i.InterviewDate >= date && i.InterviewDate < nextMonth) ||
                            (i.InterviewDate == null && i.JobStartDate >= date && i.JobStartDate < nextMonth));
                    }
                }

                var list = query.ToList();

                // Load all DB leads + users + employees
                var allDbLeads = _context.Leads.AsNoTracking().ToList();
                var allUsers   = _context.Users.AsNoTracking().ToList();
                var allEmployees = _context.Employees
                    .Include(e => e.FunctionalRoleHistories)
                    .Include(e => e.LineManagerHistories)
                    .AsNoTracking().ToList();

                // Fetch BDs, Devs, and Profile Owners sets
                var bdNamesSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                var devNamesSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                var profileOwnersSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                try
                {
                    var conn = _context.Database.GetDbConnection();
                    if (conn.State != System.Data.ConnectionState.Open) conn.Open();
                    using var cmd = conn.CreateCommand();
                    cmd.CommandText = @"
                        SELECT DISTINCT RTRIM(LTRIM(insert_by)) AS name, 'BD' AS type FROM mkt.interview_master WHERE insert_by IS NOT NULL AND RTRIM(LTRIM(insert_by)) <> '' AND RTRIM(LTRIM(insert_by)) <> 'Unassigned'
                        UNION
                        SELECT DISTINCT RTRIM(LTRIM(insert_by)) AS name, 'DEV' AS type FROM mkt.interview_detail WHERE insert_by IS NOT NULL AND RTRIM(LTRIM(insert_by)) <> '' AND RTRIM(LTRIM(insert_by)) <> 'Unassigned'
                        UNION
                        SELECT DISTINCT RTRIM(LTRIM(job_hunter_name)) AS name, 'BD' AS type FROM dbo.Rizviz_Interviews_Live WHERE job_hunter_name IS NOT NULL AND RTRIM(LTRIM(job_hunter_name)) <> ''";
                    using var r = cmd.ExecuteReader();
                    while (r.Read())
                    {
                        var n = r["name"]?.ToString()?.Trim();
                        var t = r["type"]?.ToString()?.Trim();
                        if (!string.IsNullOrEmpty(n))
                        {
                            if (t == "BD") bdNamesSet.Add(n);
                            else if (t == "DEV") devNamesSet.Add(n);
                        }
                    }
                }
                catch { }

                try
                {
                    var conn = _context.Database.GetDbConnection();
                    if (conn.State != System.Data.ConnectionState.Open) conn.Open();
                    using var cmd = conn.CreateCommand();
                    cmd.CommandText = @"SELECT profile_name FROM prof.Profile_Owners WHERE profile_name IS NOT NULL AND RTRIM(profile_name) <> ''";
                    using var r = cmd.ExecuteReader();
                    while (r.Read())
                    {
                        var n = r["profile_name"]?.ToString()?.Trim();
                        if (!string.IsNullOrEmpty(n)) profileOwnersSet.Add(n);
                    }
                }
                catch { }

                // Fetch HRMS Entities (company employees with IT/Non-IT, Job Roles, Employee Roles, Titles)
                var hrmsEntities = new Dictionary<string, HrmsEntityInfo>(StringComparer.OrdinalIgnoreCase);
                try
                {
                    var conn = _context.Database.GetDbConnection();
                    if (conn.State != System.Data.ConnectionState.Open) conn.Open();
                    using var cmd = conn.CreateCommand();
                    cmd.CommandText = @"
                        SELECT 
                            CAST(e.entity_code AS VARCHAR(50)) AS entity_code,
                            e.shortcode,
                            RTRIM(LTRIM(e.full_name)) AS full_name,
                            e.is_Non_IT,
                            jr.RoleName AS JobRole,
                            jr.Description AS JobRoleDesc,
                            r.RoleName AS EmpRole,
                            jt.JobTitle,
                            ft.FunctionalTitle
                        FROM hrms.entity e
                        LEFT JOIN hrms_setups.EmployeeJobRoles jr ON e.EmpJOBRole_Code = jr.EmpJOBRole_Code
                        LEFT JOIN hrms_setups.EmployeeRoles r ON e.EmpRole_Code = r.EmpRole_Code
                        LEFT JOIN hrms_setups.EmployeeJobTitles jt ON e.EmpJOBTitle_Code = jt.EmpJOBTitle_Code
                        LEFT JOIN hrms_setups.EmployeeFunctionalTitles ft ON e.EmpFunctTitle_Code = ft.EmpFunctTitle_Code
                        WHERE e.full_name IS NOT NULL AND RTRIM(LTRIM(e.full_name)) <> ''";
                    using var r = cmd.ExecuteReader();
                    while (r.Read())
                    {
                        var fn = r["full_name"]?.ToString()?.Trim();
                        if (!string.IsNullOrEmpty(fn) && !hrmsEntities.ContainsKey(fn))
                        {
                            hrmsEntities[fn] = new HrmsEntityInfo
                            {
                                EntityCode = r["entity_code"]?.ToString()?.Trim(),
                                Shortcode = r["shortcode"]?.ToString()?.Trim(),
                                FullName = fn,
                                IsNonIt = r["is_Non_IT"]?.ToString()?.Trim(),
                                JobRole = r["JobRole"]?.ToString()?.Trim(),
                                JobRoleDesc = r["JobRoleDesc"]?.ToString()?.Trim(),
                                EmpRole = r["EmpRole"]?.ToString()?.Trim(),
                                JobTitle = r["JobTitle"]?.ToString()?.Trim(),
                                FunctionalTitle = r["FunctionalTitle"]?.ToString()?.Trim()
                            };
                        }
                    }
                }
                catch { }

                // Group interview candidates
                var groupedDict = list
                    .Where(i => !string.IsNullOrWhiteSpace(i.IntervieweeName))
                    .GroupBy(i => i.IntervieweeName.Trim().ToLowerInvariant())
                    .ToDictionary(g => g.Key, g => g.ToList());

                // Build a master list of all person names to show
                var allPeopleNames = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

                // 1. From interviews
                foreach (var k in groupedDict.Keys)
                {
                    var name = groupedDict[k].First().IntervieweeName.Trim();
                    allPeopleNames[name] = name;
                }

                // 2. From HRMS Entity (company database)
                foreach (var h in hrmsEntities.Values)
                {
                    if (!allPeopleNames.ContainsKey(h.FullName))
                    {
                        allPeopleNames[h.FullName] = h.FullName;
                    }
                }

                // 3. From Profile Owners
                foreach (var po in profileOwnersSet)
                {
                    if (!allPeopleNames.ContainsKey(po)) allPeopleNames[po] = po;
                }

                // 4. From BD names
                foreach (var bd in bdNamesSet)
                {
                    if (!allPeopleNames.ContainsKey(bd)) allPeopleNames[bd] = bd;
                }

                // 5. From Dev names
                foreach (var dev in devNamesSet)
                {
                    if (!allPeopleNames.ContainsKey(dev)) allPeopleNames[dev] = dev;
                }

                // 6. From Users (Managers, Admins, HR, BD, Devs)
                foreach (var u in allUsers)
                {
                    var name = !string.IsNullOrWhiteSpace(u.InterviewName) ? u.InterviewName.Trim() : u.FullName?.Trim();
                    if (!string.IsNullOrEmpty(name) && !allPeopleNames.ContainsKey(name))
                    {
                        allPeopleNames[name] = name;
                    }
                }

                // 7. From Employees (Managers, Team Leads, Engineers)
                foreach (var e in allEmployees)
                {
                    var name = e.FullName?.Trim();
                    if (!string.IsNullOrEmpty(name) && !allPeopleNames.ContainsKey(name))
                    {
                        allPeopleNames[name] = name;
                    }
                }

                var resultList = new List<object>();

                foreach (var nameEntry in allPeopleNames)
                {
                    var displayName = nameEntry.Value;
                    var key = displayName.Trim().ToLowerInvariant();

                    var hasInterviews = groupedDict.TryGetValue(key, out var g) && g != null && g.Count > 0;

                    // Match with HRMS entity
                    hrmsEntities.TryGetValue(displayName, out var hrmsEntity);

                    // Load user and employee matches
                    var matchedUser = allUsers.FirstOrDefault(u =>
                        string.Equals(u.InterviewName?.Trim(), displayName, StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(u.FullName?.Trim(), displayName, StringComparison.OrdinalIgnoreCase));

                    var matchedEmp = allEmployees.FirstOrDefault(e =>
                        string.Equals(e.FullName?.Trim(), displayName, StringComparison.OrdinalIgnoreCase));

                    // IT vs Non-IT
                    string itStatus = null;
                    if (hrmsEntity != null)
                    {
                        if (hrmsEntity.IsNonIt == "I") itStatus = "IT";
                        else if (hrmsEntity.IsNonIt == "N") itStatus = "Non-IT";
                    }

                    // Determine Categories
                    var categories = new List<string>();

                    bool isProfileHolder = profileOwnersSet.Contains(displayName) || hasInterviews;
                    if (isProfileHolder) categories.Add("Profile Holder");

                    bool isBD = bdNamesSet.Contains(displayName) ||
                        (hrmsEntity != null && (
                            (hrmsEntity.JobRole != null && hrmsEntity.JobRole.StartsWith("BD", StringComparison.OrdinalIgnoreCase)) ||
                            (hrmsEntity.JobRoleDesc != null && (hrmsEntity.JobRoleDesc.Contains("Lead Generation", StringComparison.OrdinalIgnoreCase) || hrmsEntity.JobRoleDesc.StartsWith("BD", StringComparison.OrdinalIgnoreCase))) ||
                            (hrmsEntity.FunctionalTitle != null && (hrmsEntity.FunctionalTitle.Contains("Lead Generation", StringComparison.OrdinalIgnoreCase) || hrmsEntity.FunctionalTitle.Contains("Business Development", StringComparison.OrdinalIgnoreCase))) ||
                            (hrmsEntity.EmpRole != null && (hrmsEntity.EmpRole.Contains("Marketing", StringComparison.OrdinalIgnoreCase) || hrmsEntity.EmpRole.Contains("BD", StringComparison.OrdinalIgnoreCase)))
                        )) ||
                        (matchedUser != null && (matchedUser.RoleName?.Contains("BD", StringComparison.OrdinalIgnoreCase) == true || matchedUser.RoleName?.Contains("Hunter", StringComparison.OrdinalIgnoreCase) == true)) ||
                        (matchedEmp != null && (matchedEmp.Grade?.Contains("BD", StringComparison.OrdinalIgnoreCase) == true || matchedEmp.Remarks?.Contains("BD", StringComparison.OrdinalIgnoreCase) == true));
                    if (isBD) categories.Add("BD");

                    bool isManager = (hrmsEntity != null && (
                            new[] { "DEV-MNGR", "BD-MNGR", "BD-MGR", "ASTMGR", "MNGR", "Mngr", "CEO", "CTO", "COO", "DEV-PM" }.Contains(hrmsEntity.JobRole, StringComparer.OrdinalIgnoreCase) ||
                            (hrmsEntity.JobRoleDesc != null && hrmsEntity.JobRoleDesc.Contains("Manager", StringComparison.OrdinalIgnoreCase)) ||
                            (hrmsEntity.JobTitle != null && hrmsEntity.JobTitle.Contains("Manager", StringComparison.OrdinalIgnoreCase)) ||
                            (hrmsEntity.FunctionalTitle != null && hrmsEntity.FunctionalTitle.Contains("Manager", StringComparison.OrdinalIgnoreCase))
                        )) ||
                        (matchedUser != null && (matchedUser.RoleName?.Equals("Manager", StringComparison.OrdinalIgnoreCase) == true || matchedUser.RoleName?.Equals("Admin", StringComparison.OrdinalIgnoreCase) == true || matchedUser.RoleName?.Equals("HR", StringComparison.OrdinalIgnoreCase) == true)) ||
                        (matchedEmp != null && (matchedEmp.Type?.Contains("Manager", StringComparison.OrdinalIgnoreCase) == true || matchedEmp.Grade?.Contains("Manager", StringComparison.OrdinalIgnoreCase) == true || matchedEmp.Remarks?.Contains("Manager", StringComparison.OrdinalIgnoreCase) == true));
                    if (isManager) categories.Add("Manager");

                    bool isTeamLead = (hrmsEntity != null && (
                            new[] { "DEV-TL", "BD-TL" }.Contains(hrmsEntity.JobRole, StringComparer.OrdinalIgnoreCase) ||
                            (hrmsEntity.JobRoleDesc != null && (hrmsEntity.JobRoleDesc.Contains("Team Lead", StringComparison.OrdinalIgnoreCase) || hrmsEntity.JobRoleDesc.Contains("Tech Lead", StringComparison.OrdinalIgnoreCase))) ||
                            (hrmsEntity.JobTitle != null && (hrmsEntity.JobTitle.Contains("Team Lead", StringComparison.OrdinalIgnoreCase) || hrmsEntity.JobTitle.Contains("Technical Lead", StringComparison.OrdinalIgnoreCase)))
                        )) ||
                        (matchedUser != null && matchedUser.RoleName?.Contains("Lead", StringComparison.OrdinalIgnoreCase) == true) ||
                        (matchedEmp != null && (matchedEmp.FunctionalRoleHistories?.Any(fr => fr.FunctionalRole?.Contains("Team Lead", StringComparison.OrdinalIgnoreCase) == true || fr.FunctionalTitle?.Contains("Team Lead", StringComparison.OrdinalIgnoreCase) == true) == true));
                    if (isTeamLead) categories.Add("Team Lead");

                    bool isDev = devNamesSet.Contains(displayName) ||
                        (hrmsEntity != null && (
                            string.Equals(hrmsEntity.JobRole, "DEV", StringComparison.OrdinalIgnoreCase) ||
                            string.Equals(hrmsEntity.JobRole, "DEV-TL", StringComparison.OrdinalIgnoreCase) ||
                            string.Equals(hrmsEntity.JobRole, "DEV-MNGR", StringComparison.OrdinalIgnoreCase) ||
                            (hrmsEntity.EmpRole != null && hrmsEntity.EmpRole.Contains("Dev", StringComparison.OrdinalIgnoreCase)) ||
                            (hrmsEntity.IsNonIt == "I" && !isBD && !new[] { "CEO", "CTO", "COO", "Mngr", "MNGR" }.Contains(hrmsEntity.JobRole, StringComparer.OrdinalIgnoreCase))
                        )) ||
                        (matchedUser != null && (matchedUser.RoleName?.Contains("Dev", StringComparison.OrdinalIgnoreCase) == true || matchedUser.RoleName?.Equals("Employee", StringComparison.OrdinalIgnoreCase) == true)) ||
                        (matchedEmp != null && (matchedEmp.ItOrNonIt?.Equals("IT", StringComparison.OrdinalIgnoreCase) == true));
                    if (isDev) categories.Add("Developer");

                    if (categories.Count == 0) categories.Add("Profile Holder");

                    // Primary category selection
                    string primaryCat = "Profile Holder";
                    if (categories.Contains("Manager")) primaryCat = "Manager";
                    else if (categories.Contains("Team Lead")) primaryCat = "Team Lead";
                    else if (categories.Contains("BD")) primaryCat = "BD";
                    else if (categories.Contains("Developer")) primaryCat = "Developer";

                    // Email lookup
                    var email = matchedUser?.Email
                        ?? (hrmsEntity != null && !string.IsNullOrEmpty(hrmsEntity.EntityCode) ? $"{hrmsEntity.EntityCode}@rizviz.com" : null)
                        ?? (matchedEmp != null ? $"{matchedEmp.EmpCode.ToLower()}@rizviz.com" : "");

                    // Designation
                    string designation = hrmsEntity?.JobRoleDesc
                        ?? hrmsEntity?.JobTitle
                        ?? hrmsEntity?.FunctionalTitle
                        ?? hrmsEntity?.EmpRole
                        ?? hrmsEntity?.JobRole
                        ?? matchedUser?.RoleName
                        ?? matchedEmp?.FunctionalRoleHistories?.FirstOrDefault()?.FunctionalTitle
                        ?? primaryCat;

                    // Interview stats if available
                    int ivCount = hasInterviews ? g.Count : 0;
                    var mostCommonType = hasInterviews
                        ? g.GroupBy(x => x.InterviewType).OrderByDescending(xg => xg.Count()).Select(xg => xg.Key).FirstOrDefault()
                        : null;

                    var companies = hasInterviews
                        ? g.Select(x => x.CompanyName).Where(c => !string.IsNullOrWhiteSpace(c)).Select(c => c.Trim())
                           .Where(c => !SeedHelper.LooksLikeDateOrPlaceholder(c)).Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(c => c).ToList()
                        : new List<string>();

                    var stacks = hasInterviews
                        ? g.Select(x => x.Stack).Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Trim())
                           .Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(s => s).ToList()
                        : new List<string>();

                    string expYears;
                    if (ivCount >= 20) expYears = "7+ Yrs (Senior Lead)";
                    else if (ivCount >= 10) expYears = "5-7 Yrs (Senior)";
                    else if (ivCount >= 5) expYears = "3-5 Yrs (Mid-Level)";
                    else if (ivCount > 0) expYears = "2-3 Yrs (Associate)";
                    else expYears = "Company Staff";

                    var addedDate = hasInterviews ? g.Min(x => x.InterviewDate ?? x.JobStartDate ?? x.CreatedAt) : (DateTime?)null;

                    // Leads outcomes
                    int leadsCount = 0, convertedCount = 0, rejectedCount = 0, droppedCount = 0;

                    if (hasInterviews)
                    {
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
                        leadsCount     = allLeadOutcomes.Count;
                        convertedCount = allLeadOutcomes.Count(x => x.hasConverted);
                        rejectedCount  = allLeadOutcomes.Count(x => x.hasRejected);
                        droppedCount   = allLeadOutcomes.Count(x => x.hasDropped);
                    }

                    const int previewLimit = 5;

                    // Filtering by search term if provided
                    if (!string.IsNullOrWhiteSpace(search))
                    {
                        var term = search.Trim().ToLowerInvariant();
                        bool matches = displayName.ToLowerInvariant().Contains(term) ||
                            (email != null && email.ToLowerInvariant().Contains(term)) ||
                            (designation != null && designation.ToLowerInvariant().Contains(term)) ||
                            (hrmsEntity?.JobRole != null && hrmsEntity.JobRole.ToLowerInvariant().Contains(term)) ||
                            (hrmsEntity?.JobRoleDesc != null && hrmsEntity.JobRoleDesc.ToLowerInvariant().Contains(term)) ||
                            (hrmsEntity?.EmpRole != null && hrmsEntity.EmpRole.ToLowerInvariant().Contains(term)) ||
                            (itStatus != null && itStatus.ToLowerInvariant().Contains(term)) ||
                            categories.Any(c => c.ToLowerInvariant().Contains(term)) ||
                            companies.Any(c => c.ToLowerInvariant().Contains(term)) ||
                            stacks.Any(s => s.ToLowerInvariant().Contains(term));

                        if (!matches) continue;
                    }

                    resultList.Add(new {
                        interviewee_name    = displayName,
                        initial             = displayName.Substring(0, 1).ToUpper(),
                        email               = email ?? "",
                        designation         = designation,
                        job_role            = hrmsEntity?.JobRole ?? "",
                        job_role_desc       = hrmsEntity?.JobRoleDesc ?? "",
                        emp_role            = hrmsEntity?.EmpRole ?? "",
                        it_status           = itStatus ?? (isDev ? "IT" : ""),
                        categories          = categories,
                        primary_category    = primaryCat,
                        experience_years    = expYears,
                        interview_count     = ivCount,
                        leads_count         = leadsCount,
                        company_count       = companies.Count,
                        companies           = companies.Take(previewLimit).ToList(),
                        companies_more_count= Math.Max(0, companies.Count - previewLimit),
                        stacks              = stacks,
                        latest_date         = hasInterviews ? g.Max(x => x.InterviewDate ?? x.JobStartDate) : (DateTime?)null,
                        added_date          = addedDate,
                        top_type            = mostCommonType,
                        converted_count     = convertedCount,
                        rejected_count      = rejectedCount,
                        dropped_count       = droppedCount,
                    });
                }

                var sorted = resultList
                    .OrderByDescending(x => ((dynamic)x).interview_count)
                    .ThenBy(x => ((dynamic)x).interviewee_name)
                    .ToList();

                return Ok(sorted);
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

        [HttpGet("mkt-details/{id}")]
        public IActionResult GetMktInterviewDetails(string id)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(id))
                    return BadRequest(new { message = "Interview id is required" });

                var conn = _context.Database.GetDbConnection();
                if (conn.State != System.Data.ConnectionState.Open) conn.Open();

                int interviewCode = 0;
                int seqCode = 0;

                // Try finding seqCode and interviewCode from id
                if (int.TryParse(id, out var parsedId))
                {
                    seqCode = parsedId;
                    using (var findCmd = conn.CreateCommand())
                    {
                        findCmd.CommandText = "SELECT interview_code, interview_seq_code FROM mkt.interview_detail WHERE interview_seq_code = @sid OR interview_code = @sid";
                        var p = findCmd.CreateParameter();
                        p.ParameterName = "@sid";
                        p.Value = parsedId;
                        findCmd.Parameters.Add(p);
                        using var r = findCmd.ExecuteReader();
                        if (r.Read())
                        {
                            interviewCode = Convert.ToInt32(r["interview_code"]);
                            seqCode = Convert.ToInt32(r["interview_seq_code"]);
                        }
                    }

                    if (interviewCode == 0)
                    {
                        using (var findCmd2 = conn.CreateCommand())
                        {
                            findCmd2.CommandText = "SELECT interview_code FROM mkt.interview_master WHERE interview_code = @mid";
                            var p2 = findCmd2.CreateParameter();
                            p2.ParameterName = "@mid";
                            p2.Value = parsedId;
                            findCmd2.Parameters.Add(p2);
                            using var r2 = findCmd2.ExecuteReader();
                            if (r2.Read())
                            {
                                interviewCode = Convert.ToInt32(r2["interview_code"]);
                            }
                        }
                    }
                }

                if (interviewCode == 0)
                {
                    var interview = _context.Interviews.AsNoTracking().FirstOrDefault(i => i.Id == seqCode);
                    if (interview != null && int.TryParse(interview.InterviewCode, out var ic))
                    {
                        interviewCode = ic;
                    }
                }

                if (interviewCode == 0)
                {
                    return NotFound(new { message = $"No marketing interview record found for ID '{id}'" });
                }

                // 1. Fetch Master Row (mkt.interview_master)
                var masterDict = new Dictionary<string, object>();
                using (var mCmd = conn.CreateCommand())
                {
                    mCmd.CommandText = @"
                        SELECT 
                            m.interview_code,
                            m.lead_code,
                            m.company_name,
                            m.recruiter_name,
                            m.interview_to,
                            m.position,
                            m.payscale_val,
                            m.payscale_unit,
                            m.job_reference,
                            m.remarks,
                            m.direct_self,
                            m.Overall_sts,
                            m.insert_by,
                            m.insert_time,
                            m.Job_landed_date,
                            m.rejection_reason,
                            m.staffing_firm,
                            m.implementation_partner,
                            stk.stack_name
                        FROM mkt.interview_master m
                        LEFT JOIN setups.stacks stk ON m.stack_code = stk.stack_code
                        WHERE m.interview_code = @ic";
                    var mp = mCmd.CreateParameter();
                    mp.ParameterName = "@ic";
                    mp.Value = interviewCode;
                    mCmd.Parameters.Add(mp);
                    using var mr = mCmd.ExecuteReader();
                    if (mr.Read())
                    {
                        for (int i = 0; i < mr.FieldCount; i++)
                        {
                            masterDict[mr.GetName(i)] = mr.IsDBNull(i) ? null : mr.GetValue(i);
                        }
                    }
                }

                // 2. Fetch Detail Rows (mkt.interview_detail)
                var detailsList = new List<Dictionary<string, object>>();
                using (var dCmd = conn.CreateCommand())
                {
                    dCmd.CommandText = @"
                        SELECT 
                            d.interview_seq_code,
                            d.interview_code,
                            d.intv_status,
                            d.intv_datetime,
                            d.intv_type,
                            d.time_Zone,
                            d.interview_time,
                            d.indicator_time,
                            d.BD_feedback,
                            d.Dev_feedback,
                            d.barriers,
                            d.Notes,
                            d.JD,
                            d.meeting_link,
                            d.jd_file_name,
                            d.resume_file_name,
                            d.insert_by,
                            d.insert_time,
                            stk.stack_name
                        FROM mkt.interview_detail d
                        LEFT JOIN setups.stacks stk ON d.stack_code = stk.stack_code
                        WHERE d.interview_code = @ic
                        ORDER BY d.intv_datetime DESC, d.interview_seq_code DESC";
                    var dp = dCmd.CreateParameter();
                    dp.ParameterName = "@ic";
                    dp.Value = interviewCode;
                    dCmd.Parameters.Add(dp);
                    using var dr = dCmd.ExecuteReader();
                    while (dr.Read())
                    {
                        var row = new Dictionary<string, object>();
                        for (int i = 0; i < dr.FieldCount; i++)
                        {
                            row[dr.GetName(i)] = dr.IsDBNull(i) ? null : dr.GetValue(i);
                        }
                        detailsList.Add(row);
                    }
                }

                // 3. Fetch Stakeholders (mkt.interview_stakeholders joined with hrms.entity)
                var stakeholdersList = new List<Dictionary<string, object>>();
                using (var sCmd = conn.CreateCommand())
                {
                    sCmd.CommandText = @"
                        SELECT 
                            s.interview_code,
                            s.interview_seq_code,
                            s.entity_code,
                            e.shortcode,
                            RTRIM(LTRIM(e.full_name)) AS full_name,
                            e.is_Non_IT,
                            jr.RoleName AS job_role,
                            jr.Description AS job_role_desc,
                            r.RoleName AS emp_role,
                            ft.FunctionalTitle AS functional_title,
                            s.service_type,
                            s.service_subType,
                            s.first_salary,
                            s.Commision_amt,
                            s.insert_by,
                            s.insert_time
                        FROM mkt.interview_stakeholders s
                        LEFT JOIN hrms.entity e ON s.entity_code = e.entity_code
                        LEFT JOIN hrms_setups.EmployeeJobRoles jr ON s.empjobrole_code = jr.EmpJOBRole_Code
                        LEFT JOIN hrms_setups.EmployeeRoles r ON s.EmpRole_Code = r.EmpRole_Code
                        LEFT JOIN hrms_setups.EmployeeFunctionalTitles ft ON s.EmpFunctTitle_Code = ft.EmpFunctTitle_Code
                        WHERE s.interview_code = @ic
                        ORDER BY s.entity_code";
                    var sp = sCmd.CreateParameter();
                    sp.ParameterName = "@ic";
                    sp.Value = interviewCode;
                    sCmd.Parameters.Add(sp);
                    using var sr = sCmd.ExecuteReader();
                    while (sr.Read())
                    {
                        var row = new Dictionary<string, object>();
                        for (int i = 0; i < sr.FieldCount; i++)
                        {
                            row[sr.GetName(i)] = sr.IsDBNull(i) ? null : sr.GetValue(i);
                        }
                        var isNonIt = row.ContainsKey("is_Non_IT") ? row["is_Non_IT"]?.ToString()?.Trim() : "";
                        row["it_status"] = isNonIt == "I" ? "IT" : (isNonIt == "N" ? "Non-IT" : "");
                        stakeholdersList.Add(row);
                    }
                }

                return Ok(new
                {
                    interview_code = interviewCode,
                    master = masterDict,
                    details = detailsList,
                    detail = detailsList.FirstOrDefault(d => Convert.ToInt32(d["interview_seq_code"]) == seqCode) ?? detailsList.FirstOrDefault(),
                    stakeholders = stakeholdersList
                });
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

        private void UpdateFileTracking(string fileName, string filePath, string username)
        {
            try
            {
                var hash = ComputeSHA256(filePath);
                if (string.IsNullOrEmpty(hash)) return;

                var tracking = _context.FileTrackings.FirstOrDefault(f => f.FileName == fileName);
                if (tracking == null)
                {
                    tracking = new FileTracking
                    {
                        FileName = fileName,
                        LastUploadedHash = hash,
                        LastUploadedAt = DateTime.UtcNow,
                        LastUploadedBy = username
                    };
                    _context.FileTrackings.Add(tracking);
                }
                else
                {
                    tracking.LastUploadedHash = hash;
                    tracking.LastUploadedAt = DateTime.UtcNow;
                    tracking.LastUploadedBy = username;
                    _context.FileTrackings.Update(tracking);
                }
                _context.SaveChanges();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[FileTracking] Error updating file tracking: {ex.Message}");
            }
        }

        private static string ComputeSHA256(string filePath)
        {
            if (!System.IO.File.Exists(filePath))
                return null;
            using (var sha256 = System.Security.Cryptography.SHA256.Create())
            {
                using (var stream = System.IO.File.OpenRead(filePath))
                {
                    var hashBytes = sha256.ComputeHash(stream);
                    return BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
                }
            }
        }

        private class HrmsEntityInfo
        {
            public string EntityCode { get; set; }
            public string Shortcode { get; set; }
            public string FullName { get; set; }
            public string IsNonIt { get; set; }
            public string JobRole { get; set; }
            public string JobRoleDesc { get; set; }
            public string EmpRole { get; set; }
            public string JobTitle { get; set; }
            public string FunctionalTitle { get; set; }
        }
    }
}
