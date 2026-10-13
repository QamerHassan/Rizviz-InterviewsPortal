using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using RizvizERP.API.Models;
using RizvizERP.API.Services;
using RizvizERP.API.Data;
using Microsoft.EntityFrameworkCore;

namespace RizvizERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ArchiveController : ControllerBase
    {
        private readonly ILogger<ArchiveController> _logger;
        private readonly FileKeyService _fileKeyService;
        private readonly ArchiveService _archiveService;
        private readonly ApplicationDbContext _context;

        private static readonly string ArchivesDir =
            Path.Combine(Directory.GetCurrentDirectory(), "Archives");

        public ArchiveController(ILogger<ArchiveController> logger, FileKeyService fileKeyService, ArchiveService archiveService, ApplicationDbContext context)
        {
            _logger = logger;
            _fileKeyService = fileKeyService;
            _archiveService = archiveService;
            _context = context;
        }

        // POST /api/archive/trigger — force an immediate archive run (bypasses the once-per-day gate)
        [HttpPost("trigger")]
        public IActionResult TriggerArchive()
        {
            try
            {
                _logger.LogInformation("[ArchiveController] Manual archive trigger received.");
                _archiveService.ArchivePastInterviews();
                return Ok(new { message = "Archive run completed. Check server logs for row counts and details." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ArchiveController] Manual trigger failed.");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET /api/archive/search?from=2026-06-01&to=2026-06-30
        // GET /api/archive/search?search=ali
        [HttpGet("search")]
        public IActionResult Search(
            [FromQuery] string date     = null,
            [FromQuery] string from     = null,
            [FromQuery] string to       = null,
            [FromQuery] string filekey  = null,
            [FromQuery] string search   = null,
            [FromQuery] string company  = null,
            [FromQuery] string candidate = null,
            [FromQuery] int    page     = 1,
            [FromQuery] int    limit    = 50)
        {
            try
            {
                // Resolve date range
                DateTime? dateFrom = null;
                DateTime? dateTo   = null;

                if (!string.IsNullOrWhiteSpace(date) && DateTime.TryParse(date, out var singleDate))
                {
                    dateFrom = singleDate.Date;
                    dateTo   = singleDate.Date;
                }
                else
                {
                    if (!string.IsNullOrWhiteSpace(from) && DateTime.TryParse(from, out var df))
                        dateFrom = df.Date;
                    if (!string.IsNullOrWhiteSpace(to) && DateTime.TryParse(to, out var dt))
                        dateTo = dt.Date;
                }

                if (dateFrom == null && dateTo == null && string.IsNullOrWhiteSpace(search) && string.IsNullOrWhiteSpace(company) && string.IsNullOrWhiteSpace(candidate))
                    return BadRequest(new { message = "Provide at least one filter: date range, or search term." });

                // ── Query directly from SQL database ─────────────────────────────────
                var query = _context.Interviews.AsNoTracking().AsQueryable();

                // Date filter on InterviewDate
                if (dateFrom.HasValue)
                    query = query.Where(i => i.InterviewDate != null && i.InterviewDate.Value >= dateFrom.Value);
                if (dateTo.HasValue)
                    query = query.Where(i => i.InterviewDate != null && i.InterviewDate.Value <= dateTo.Value);

                // Text search across name, company, role, job hunter
                if (!string.IsNullOrWhiteSpace(search))
                {
                    var s = search.ToLower().Trim();
                    query = query.Where(i =>
                        (i.IntervieweeName != null && i.IntervieweeName.ToLower().Contains(s)) ||
                        (i.CompanyName     != null && i.CompanyName.ToLower().Contains(s))     ||
                        (i.InterviewFor    != null && i.InterviewFor.ToLower().Contains(s))     ||
                        (i.JobHunterName   != null && i.JobHunterName.ToLower().Contains(s)));
                }

                // Company filter
                if (!string.IsNullOrWhiteSpace(company) && company != "All")
                    query = query.Where(i => i.CompanyName != null && i.CompanyName.ToLower() == company.ToLower());

                // Candidate filter
                if (!string.IsNullOrWhiteSpace(candidate) && candidate != "All")
                    query = query.Where(i => i.IntervieweeName != null && i.IntervieweeName.ToLower() == candidate.ToLower());

                var total = query.Count();
                var pageItems = query
                    .OrderByDescending(i => i.InterviewDate)
                    .Skip((page - 1) * limit)
                    .Take(limit)
                    .Select(i => new ArchivedInterviewRow
                    {
                        Id               = i.Id,
                        Sr               = i.Sr,
                        InvTo            = i.InvTo,
                        InterviewFor     = i.InterviewFor,
                        IntervieweeName  = i.IntervieweeName,
                        JobHunterName    = i.JobHunterName,
                        CompanyName      = i.CompanyName,
                        InterviewType    = i.InterviewType,
                        Status           = i.Status,
                        JobStartDate     = i.JobStartDate,
                        JobCloseDate     = i.JobCloseDate,
                        InterviewDate    = i.InterviewDate,
                        FirstSalary      = i.FirstSalary,
                        JhSuggest        = i.JhSuggest,
                        InterviewCharges = i.InterviewCharges,
                        JhDue            = i.JhDue,
                        FirstPaymentOnJob   = i.FirstPaymentOnJob,
                        SecondPaymentOnJob  = i.SecondPaymentOnJob,
                        BalancePayable   = i.BalancePayable,
                        CreationDate     = i.CreatedAt,
                        FileKey          = i.InterviewCode,
                    })
                    .ToList();

                return Ok(new { data = pageItems, total, page, limit, isSuccess = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ArchiveController] Error during archive search.");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET /api/archive/years — list available archive years
        [HttpGet("years")]
        public IActionResult GetYears()
        {
            try
            {
                if (!Directory.Exists(ArchivesDir))
                    return Ok(new { years = new List<int>() });

                var years = Directory.GetFiles(ArchivesDir, "Archive_*.xlsx")
                    .Select(f => Path.GetFileNameWithoutExtension(f))
                    .Select(n => n.Replace("Archive_", ""))
                    .Where(n => int.TryParse(n, out _))
                    .Select(n => int.Parse(n))
                    .OrderByDescending(y => y)
                    .ToList();

                return Ok(new { years });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ─────────────────────────────────────────────────────────────────────────
        // Private helpers (kept for TriggerArchive / Excel-based flows)
        // ─────────────────────────────────────────────────────────────────────────

        private List<string> GetArchiveFilesToScan(DateTime? dateFrom, DateTime? dateTo, string filekey)
        {
            var result = new List<string>();

            if (!Directory.Exists(ArchivesDir))
                return result;

            var allArchives = Directory.GetFiles(ArchivesDir, "Archive_*.xlsx");

            // If filekey is given and has a year prefix, filter to that year
            if (!string.IsNullOrWhiteSpace(filekey))
            {
                var parts = filekey.Split('_');
                if (parts.Length >= 1 && int.TryParse(parts[0], out int fkYear))
                {
                    var targetFile = Path.Combine(ArchivesDir, $"Archive_{fkYear}.xlsx");
                    if (System.IO.File.Exists(targetFile))
                        result.Add(targetFile);
                    return result;
                }
                // Unknown year — scan all
                result.AddRange(allArchives);
                return result;
            }

            // Filter by year range derived from dateFrom / dateTo
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

            // No date range and no filekey — return all
            result.AddRange(allArchives);
            return result;
        }

        private List<ArchivedInterviewRow> ReadArchiveFile(
            string archivePath,
            DateTime? dateFrom,
            DateTime? dateTo,
            string filekey,
            string search,
            string company,
            string candidate)
        {
            var result = new List<ArchivedInterviewRow>();

            using var fs = new FileStream(archivePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
            using var wb = new XLWorkbook(fs);

            var ws = wb.Worksheets.FirstOrDefault(w =>
                w.Name.Equals("ArchivedInterviews", StringComparison.OrdinalIgnoreCase));
            if (ws == null) return result;

            var usedRows = ws.RowsUsed().ToList();
            if (usedRows.Count <= 1) return result;

            // Parse header row (row 1)
            var headerRow = usedRows[0];
            var headerMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            int maxCol = headerRow.LastCellUsed()?.Address.ColumnNumber ?? 1;

            for (int col = 1; col <= maxCol; col++)
            {
                var h = headerRow.Cell(col).GetString()?.Trim() ?? "";
                if (!string.IsNullOrEmpty(h) && !headerMap.ContainsKey(h))
                    headerMap[h] = col;
            }

            int GetCol(string name) => headerMap.TryGetValue(name, out int c) ? c : -1;

            // Column indices
            int creationDateCol = FindCol(headerMap, SeedHelper.AliasMap["CreationDate"]);
            int fileKeyCol      = GetCol("File Key");
            int candidateCol    = FindCol(headerMap, SeedHelper.AliasMap["IntervieweeName"]);
            int companyCol      = FindCol(headerMap, SeedHelper.AliasMap["CompanyName"]);
            int srCol           = FindCol(headerMap, SeedHelper.AliasMap["Sr"]);
            int invToCol        = FindCol(headerMap, SeedHelper.AliasMap["InvTo"]);
            int interviewForCol = FindCol(headerMap, SeedHelper.AliasMap["InterviewFor"]);
            int jhCol           = FindCol(headerMap, SeedHelper.AliasMap["JobHunterName"]);
            int typeCol         = FindCol(headerMap, SeedHelper.AliasMap["InterviewType"]);
            int statusCol       = FindCol(headerMap, SeedHelper.AliasMap["Status"]);
            int startDateCol    = FindCol(headerMap, SeedHelper.AliasMap["JobStartDate"]);
            int closeDateCol    = FindCol(headerMap, SeedHelper.AliasMap["JobCloseDate"]);
            int interviewDateCol = FindCol(headerMap, SeedHelper.AliasMap["InterviewDateTime"]);
            int firstSalCol     = FindCol(headerMap, SeedHelper.AliasMap["FirstSalary"]);
            int jhSuggestCol    = FindCol(headerMap, SeedHelper.AliasMap["JhSuggest"]);
            int chargesCol      = FindCol(headerMap, SeedHelper.AliasMap["InterviewCharges"]);
            int jhDueCol        = FindCol(headerMap, SeedHelper.AliasMap["JhDue"]);
            int firstPayCol     = FindCol(headerMap, SeedHelper.AliasMap["FirstPaymentOnJob"]);
            int secondPayCol    = FindCol(headerMap, SeedHelper.AliasMap["SecondPaymentOnJob"]);
            int balPayCol       = FindCol(headerMap, SeedHelper.AliasMap["BalancePayable"]);

            // Read data rows
            for (int i = 1; i < usedRows.Count; i++)
            {
                var row = usedRows[i];
                if (row.IsEmpty()) continue;

                string C(int col) => col > 0 ? row.Cell(col).GetString()?.Trim() ?? "" : "";

                // Filter: Interview DateTime range (the date that determined archiving)
                var interviewDateStr = C(interviewDateCol);
                DateTime? interviewDateParsed = DateTime.TryParse(interviewDateStr, out var idp) ? idp : (DateTime?)null;

                // Also parse Creation Date — not used for filtering, but preserved on the DTO
                var creationDateStr = C(creationDateCol);
                DateTime? creationDate = DateTime.TryParse(creationDateStr, out var cd) ? cd : (DateTime?)null;

                if (dateFrom.HasValue && (!interviewDateParsed.HasValue || interviewDateParsed.Value.Date < dateFrom.Value))
                    continue;
                if (dateTo.HasValue && (!interviewDateParsed.HasValue || interviewDateParsed.Value.Date > dateTo.Value))
                    continue;

                // Filter: File Key
                var rowFileKey = C(fileKeyCol);
                if (!string.IsNullOrWhiteSpace(filekey) &&
                    !rowFileKey.Equals(filekey, StringComparison.OrdinalIgnoreCase))
                    continue;

                // Filter: search (candidate/company/role)
                if (!string.IsNullOrWhiteSpace(search))
                {
                    var s = search.ToLower();
                    var cand    = C(candidateCol).ToLower();
                    var comp    = C(companyCol).ToLower();
                    var ifor    = C(interviewForCol).ToLower();
                    var jh      = C(jhCol).ToLower();
                    if (!cand.Contains(s) && !comp.Contains(s) && !ifor.Contains(s) && !jh.Contains(s))
                        continue;
                }

                // Filter: company
                if (!string.IsNullOrWhiteSpace(company) && company != "All")
                {
                    if (!C(companyCol).Equals(company, StringComparison.OrdinalIgnoreCase))
                        continue;
                }

                // Filter: candidate
                if (!string.IsNullOrWhiteSpace(candidate) && candidate != "All")
                {
                    if (!C(candidateCol).Equals(candidate, StringComparison.OrdinalIgnoreCase))
                        continue;
                }

                decimal ParseDec(int col)
                {
                    var s = C(col);
                    return decimal.TryParse(s, out var d) ? d : 0m;
                }

                var archRow = new ArchivedInterviewRow
                {
                    Sr                  = int.TryParse(C(srCol), out int sr) ? sr : (int?)null,
                    InvTo               = C(invToCol),
                    InterviewFor        = C(interviewForCol),
                    IntervieweeName     = C(candidateCol),
                    JobHunterName       = C(jhCol),
                    CompanyName         = C(companyCol),
                    InterviewType       = C(typeCol),
                    Status              = C(statusCol),
                    JobStartDate        = DateTime.TryParse(C(startDateCol), out var jsd) ? jsd : (DateTime?)null,
                    JobCloseDate        = DateTime.TryParse(C(closeDateCol), out var jcd) ? jcd : (DateTime?)null,
                    InterviewDate       = interviewDateParsed,
                    FirstSalary         = C(firstSalCol),
                    JhSuggest           = C(jhSuggestCol),
                    InterviewCharges    = ParseDec(chargesCol),
                    JhDue               = ParseDec(jhDueCol),
                    FirstPaymentOnJob   = ParseDec(firstPayCol),
                    SecondPaymentOnJob  = ParseDec(secondPayCol),
                    BalancePayable      = ParseDec(balPayCol),
                    CreationDate        = creationDate,
                    FileKey             = rowFileKey,
                };

                result.Add(archRow);
            }

            return result;
        }

        private static int FindCol(Dictionary<string, int> headerMap, string[] aliases)
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
    }

    // DTO returned by archive search — mirrors Interview model fields
    public class ArchivedInterviewRow
    {
        public int      Id                  { get; set; }
        public int?     Sr                  { get; set; }
        public string   InvTo               { get; set; }
        public string   InterviewFor        { get; set; }
        public string   IntervieweeName     { get; set; }
        public string   JobHunterName       { get; set; }
        public string   CompanyName         { get; set; }
        public string   InterviewType       { get; set; }
        public string   Status              { get; set; }
        public DateTime? JobStartDate       { get; set; }
        public DateTime? JobCloseDate       { get; set; }
        public DateTime? InterviewDate      { get; set; }
        public string   FirstSalary         { get; set; }
        public string   JhSuggest           { get; set; }
        public decimal  InterviewCharges    { get; set; }
        public decimal  JhDue               { get; set; }
        public decimal  FirstPaymentOnJob   { get; set; }
        public decimal  SecondPaymentOnJob  { get; set; }
        public decimal  BalancePayable      { get; set; }
        public DateTime? CreationDate       { get; set; }
        public string   FileKey             { get; set; }
    }
}
