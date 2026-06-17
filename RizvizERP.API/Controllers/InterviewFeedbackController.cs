using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OfficeOpenXml;
using OfficeOpenXml.Style;

using RizvizERP.API.Services;
using RizvizERP.API.Data;
using RizvizERP.API.Models;

namespace RizvizERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InterviewFeedbackController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<InterviewFeedbackController> _logger;
        private readonly IGoogleSheetsService _sheetsService;
        private static readonly SemaphoreSlim _fileLock = new SemaphoreSlim(1, 1);

        static InterviewFeedbackController()
        {
            ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
        }

        private readonly ApplicationDbContext _context;

        public InterviewFeedbackController(
            IConfiguration configuration,
            ILogger<InterviewFeedbackController> logger,
            IGoogleSheetsService sheetsService,
            ApplicationDbContext context)
        {
            _configuration = configuration;
            _logger = logger;
            _sheetsService = sheetsService;
            _context = context;
        }

        private string GetExcelFilePath()
        {
            var path = _configuration["ExcelSettings:InterviewFilePath"];
            if (string.IsNullOrWhiteSpace(path))
            {
                path = Path.Combine(Directory.GetCurrentDirectory(), "Data", "interviews.xlsx");
            }
            return path;
        }

        [Microsoft.AspNetCore.Authorization.Authorize]
        [HttpGet("interviews")]
        public async Task<IActionResult> GetInterviews()
        {
            var currentUserName = User.Identity?.Name 
                               ?? User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value
                               ?? User.FindFirst("name")?.Value;

            var filePath = GetExcelFilePath();
            if (!System.IO.File.Exists(filePath))
            {
                // Fallback to repository root "Interview Software.xlsx" if it exists
                var fallbackPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "Interview Software.xlsx");
                if (System.IO.File.Exists(fallbackPath))
                {
                    filePath = fallbackPath;
                }
                else
                {
                    return NotFound(new { success = false, message = $"Excel file not found at: {filePath}" });
                }
            }

            await _fileLock.WaitAsync();
            try
            {
                using var package = new ExcelPackage(new FileInfo(filePath));
                var worksheet = package.Workbook.Worksheets.FirstOrDefault();
                if (worksheet == null)
                {
                    return BadRequest(new { success = false, message = "No worksheets found in the Excel file." });
                }

                int rowCount = worksheet.Dimension?.Rows ?? 0;
                int colCount = worksheet.Dimension?.Columns ?? 0;

                if (rowCount < 2)
                {
                    return Ok(new
                    {
                        success = true,
                        total = 0,
                        interviews = Array.Empty<object>(),
                        currentUser = currentUserName,
                        uniqueInterviewers = Array.Empty<string>(),
                        uniqueInterviewees = Array.Empty<string>(),
                        uniqueCompanies = Array.Empty<string>()
                    });
                }

                // Row 2 has the headers
                var headers = new List<string>();
                for (int col = 1; col <= colCount; col++)
                {
                    headers.Add(worksheet.Cells[2, col].Value?.ToString()?.Trim() ?? $"Column{col}");
                }

                var interviewsList = new List<Dictionary<string, string>>();
                var interviewers = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                var interviewees = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                var companies = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                // Row 3+ has data
                for (int row = 3; row <= rowCount; row++)
                {
                    var isRowEmpty = true;
                    var rowData = new Dictionary<string, string>();

                    for (int col = 1; col <= headers.Count; col++)
                    {
                        var cellVal = worksheet.Cells[row, col].Value?.ToString()?.Trim();
                        rowData[headers[col - 1]] = cellVal ?? "";
                        if (!string.IsNullOrEmpty(cellVal))
                        {
                            isRowEmpty = false;
                        }
                    }

                    if (isRowEmpty) continue;

                    // Extract interviewer (all interviewers still shown)
                    var interviewerKey = headers.FirstOrDefault(h => h.Equals("INTERVIEW FOR", StringComparison.OrdinalIgnoreCase));
                    if (interviewerKey != null && rowData.TryGetValue(interviewerKey, out var interviewerVal) && !string.IsNullOrWhiteSpace(interviewerVal))
                    {
                        interviewers.Add(interviewerVal.Trim());
                    }

                    // Extract interviewee and check if it matches current user
                    var intervieweeKey = headers.FirstOrDefault(h => h.Equals("INTERVIEWEE NAME", StringComparison.OrdinalIgnoreCase));
                    string intervieweeVal = null;
                    if (intervieweeKey != null)
                    {
                        rowData.TryGetValue(intervieweeKey, out intervieweeVal);
                        intervieweeVal = intervieweeVal?.Trim();
                    }

                    // Case-insensitive match check
                    bool isMatch = false;
                    if (!string.IsNullOrEmpty(currentUserName) && !string.IsNullOrEmpty(intervieweeVal))
                    {
                        isMatch = intervieweeVal.Equals(currentUserName, StringComparison.OrdinalIgnoreCase);
                    }

                    if (isMatch)
                    {
                        interviewsList.Add(rowData);

                        if (!string.IsNullOrEmpty(intervieweeVal))
                        {
                            interviewees.Add(intervieweeVal);
                        }

                        var companyKey = headers.FirstOrDefault(h => h.Equals("COMPANY NAME", StringComparison.OrdinalIgnoreCase));
                        if (companyKey != null && rowData.TryGetValue(companyKey, out var companyVal) && !string.IsNullOrWhiteSpace(companyVal))
                        {
                            companies.Add(companyVal.Trim());
                        }
                    }
                }

                return Ok(new
                {
                    success = true,
                    total = interviewsList.Count,
                    interviews = interviewsList,
                    currentUser = currentUserName,
                    uniqueInterviewers = interviewers.OrderBy(x => x).ToList(),
                    uniqueInterviewees = interviewees.OrderBy(x => x).ToList(),
                    uniqueCompanies = companies.OrderBy(x => x).ToList()
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reading interviews from Excel");
                return StatusCode(500, new { success = false, message = $"Error reading Excel file: {ex.Message}" });
            }
            finally
            {
                _fileLock.Release();
            }
        }

        [HttpPost("feedback")]
        public async Task<IActionResult> SaveFeedback([FromBody] FeedbackSaveRequest request)
        {
            if (request == null || request.Sr <= 0)
            {
                return BadRequest(new { success = false, message = "Invalid request or Sr number." });
            }

            var filePath = GetExcelFilePath();
            if (!System.IO.File.Exists(filePath))
            {
                var fallbackPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "Interview Software.xlsx");
                if (System.IO.File.Exists(fallbackPath))
                {
                    filePath = fallbackPath;
                }
                else
                {
                    return NotFound(new { success = false, message = $"Excel file not found at: {filePath}" });
                }
            }

            await _fileLock.WaitAsync();
            try
            {
                // Create backup before writing
                var directory = Path.GetDirectoryName(filePath);
                var fileNameWithoutExtension = Path.GetFileNameWithoutExtension(filePath);
                var extension = Path.GetExtension(filePath);
                var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
                var backupPath = Path.Combine(directory, $"{fileNameWithoutExtension}_backup_{timestamp}{extension}");

                System.IO.File.Copy(filePath, backupPath, true);

                using (var package = new ExcelPackage(new FileInfo(filePath)))
                {
                    var worksheet = package.Workbook.Worksheets.FirstOrDefault();
                    if (worksheet == null)
                    {
                        return BadRequest(new { success = false, message = "No worksheets found in the Excel file." });
                    }

                    int rowCount = worksheet.Dimension?.Rows ?? 0;
                    int colCount = worksheet.Dimension?.Columns ?? 0;

                    if (rowCount < 2)
                    {
                        return BadRequest(new { success = false, message = "Worksheet does not have header row." });
                    }

                    // Build headers map (1-indexed col index)
                    var headersMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                    for (int col = 1; col <= colCount; col++)
                    {
                        var headerName = worksheet.Cells[2, col].Value?.ToString()?.Trim();
                        if (!string.IsNullOrEmpty(headerName))
                        {
                            headersMap[headerName] = col;
                        }
                    }

                    // Columns we want to write/check
                    var targetColumns = new[]
                    {
                        "AI Feedback",
                        "Rating",
                        "Strengths",
                        "Weaknesses",
                        "Recommendation",
                        "Feedback By",
                        "Feedback Date"
                    };

                    // Check if target columns exist, if not add them
                    foreach (var colName in targetColumns)
                    {
                        if (!headersMap.ContainsKey(colName))
                        {
                            colCount++;
                            var cell = worksheet.Cells[2, colCount];
                            cell.Value = colName;
                            
                            // Style header cell: Bold + Light Blue background
                            cell.Style.Font.Bold = true;
                            cell.Style.Fill.PatternType = ExcelFillStyle.Solid;
                            cell.Style.Fill.BackgroundColor.SetColor(System.Drawing.Color.LightSkyBlue);
                            cell.Style.Border.BorderAround(ExcelBorderStyle.Thin);
                            
                            headersMap[colName] = colCount;
                        }
                    }

                    // Find row by Sr in column A
                    int targetRow = -1;
                    for (int row = 3; row <= rowCount; row++)
                    {
                        var srValStr = worksheet.Cells[row, 1].Value?.ToString()?.Trim();
                        if (int.TryParse(srValStr, out int srVal) && srVal == request.Sr)
                        {
                            targetRow = row;
                            break;
                        }
                    }

                    if (targetRow == -1)
                    {
                        return NotFound(new { success = false, message = $"Sr. {request.Sr} not found in Column A." });
                    }

                    // Read existing interview details from the Excel row so we can write them to Google Sheets
                    var getVal = new Func<string, string>(key => {
                        var matchedKey = headersMap.Keys.FirstOrDefault(k => 
                            k.Trim().TrimEnd(':').Trim().Equals(key, StringComparison.OrdinalIgnoreCase));
                        return matchedKey != null && headersMap.TryGetValue(matchedKey, out int colIdx) 
                            ? worksheet.Cells[targetRow, colIdx].Value?.ToString()?.Trim() 
                            : "";
                    });

                    var candidateName = getVal("INTERVIEWEE NAME");
                    var companyName = getVal("COMPANY NAME");
                    var interviewerName = getVal("INTERVIEW FOR");
                    var interviewDate = getVal("DATE");
                    var interviewType = getVal("INTERVIEW TYPE");

                    // Write feedback values
                    worksheet.Cells[targetRow, headersMap["AI Feedback"]].Value = request.AiProcessedFeedback;
                    worksheet.Cells[targetRow, headersMap["Rating"]].Value = request.Rating;
                    worksheet.Cells[targetRow, headersMap["Strengths"]].Value = request.Strengths;
                    worksheet.Cells[targetRow, headersMap["Weaknesses"]].Value = request.Weaknesses;
                    worksheet.Cells[targetRow, headersMap["Recommendation"]].Value = request.Recommendation;
                    worksheet.Cells[targetRow, headersMap["Feedback By"]].Value = request.FeedbackBy;
                    worksheet.Cells[targetRow, headersMap["Feedback Date"]].Value = request.FeedbackDate;

                    // Save the file
                    package.Save();

                    // Save to DB as backup
                    try
                    {
                        var dbFeedback = new InterviewFeedback
                        {
                            InterviewerName = request.FeedbackBy ?? interviewerName,
                            IntervieweeName = candidateName,
                            CompanyName = companyName,
                            InterviewType = interviewType,
                            InterviewDate = SeedHelper.ParseExcelDate(interviewDate),
                            UrduTranscript = "",
                            EnglishFeedback = request.AiProcessedFeedback ?? request.FeedbackText,
                            Strengths = request.Strengths,
                            Weaknesses = request.Weaknesses,
                            Recommendation = request.Recommendation,
                            Rating = request.Rating,
                            FeedbackBy = request.FeedbackBy,
                            FeedbackDate = request.FeedbackDate,
                            CreatedAt = DateTime.UtcNow
                        };
                        _context.InterviewFeedbacks.Add(dbFeedback);
                        await _context.SaveChangesAsync();
                        _logger.LogInformation("Feedback saved to DB successfully (Sr={Sr})", request.Sr);
                    }
                    catch (Exception dbEx)
                    {
                        _logger.LogWarning(dbEx, "Failed to save backup feedback to DB.");
                    }

                    // Sync to Google Sheets — update existing row or append if no match (non-fatal)
                    bool sheetOk = false;
                    string sheetErr = null;
                    try
                    {
                        var sheetRow = new InterviewFeedbackRow
                        {
                            Sr = request.Sr,
                            CandidateName = candidateName,
                            CompanyName = companyName,
                            InterviewType = interviewType,
                            InterviewerName = interviewerName,
                            InterviewDate = interviewDate,
                            AiProcessedFeedback = request.AiProcessedFeedback ?? request.FeedbackText,
                            FeedbackText = request.FeedbackText,
                            Rating = request.Rating,
                            Strengths = request.Strengths,
                            Weaknesses = request.Weaknesses,
                            Recommendation = request.Recommendation,
                            FeedbackBy = request.FeedbackBy,
                            FeedbackDate = request.FeedbackDate
                        };

                        (sheetOk, sheetErr) = await _sheetsService.SyncInterviewFeedbackToSheetAsync(sheetRow);

                        if (sheetOk)
                            _logger.LogInformation("Google Sheets updated successfully for Sr={Sr}", request.Sr);
                        else
                            _logger.LogError("Google Sheets update failed for Sr={Sr}: {Error}", request.Sr, sheetErr);
                    }
                    catch (Exception sheetEx)
                    {
                        sheetErr = sheetEx.Message;
                        _logger.LogError(sheetEx, "Google Sheets update failed: {Error}", sheetEx.Message);
                    }

                    string sheetMsg = sheetOk ? "Synced to Google Sheet" : $"Google Sheet sync skipped: {sheetErr}";

                    return Ok(new
                    {
                        success = true,
                        message = $"Sr. {request.Sr} feedback saved! {sheetMsg}",
                        updatedRow = targetRow,
                        backupCreated = backupPath,
                        sheetSynced = sheetOk
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving feedback to Excel");
                return StatusCode(500, new { success = false, message = $"Error saving feedback: {ex.Message}" });
            }
            finally
            {
                _fileLock.Release();
            }
        }
    }

    public class FeedbackSaveRequest
    {
        public int Sr { get; set; }
        public string FeedbackText { get; set; }
        public int Rating { get; set; }
        public string Strengths { get; set; }
        public string Weaknesses { get; set; }
        public string Recommendation { get; set; }
        public string FeedbackBy { get; set; }
        public string FeedbackDate { get; set; }
        public string AiProcessedFeedback { get; set; }
    }
}
