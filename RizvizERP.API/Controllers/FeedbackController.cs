using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RizvizERP.API.Data;
using RizvizERP.API.Models;
using RizvizERP.API.Services;

namespace RizvizERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FeedbackController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _config;
        private readonly IWebHostEnvironment _env;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<FeedbackController> _logger;

        private readonly IGoogleSheetsService _sheetsService;

        public FeedbackController(
            ApplicationDbContext context,
            IConfiguration config,
            IWebHostEnvironment env,
            IHttpClientFactory httpClientFactory,
            ILogger<FeedbackController> logger,
            IGoogleSheetsService sheetsService)
        {
            _context = context;
            _config = config;
            _env = env;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _sheetsService = sheetsService;
        }

        private User GetCurrentUser()
        {
            var authHeader = Request.Headers["Authorization"].ToString();
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer db_jwt_mock_token_key_for_"))
                return null;
            var username = authHeader.Substring("Bearer db_jwt_mock_token_key_for_".Length);
            return AuthHelper.GetUserByUsername(username);
        }

        private static bool IsAdmin(User user) =>
            user != null && string.Equals(user.RoleName, "Admin", StringComparison.OrdinalIgnoreCase);

        private string GetExcelFilePath()
        {
            // Try config path first
            var path = _config["ExcelSettings:InterviewFilePath"];
            if (!string.IsNullOrWhiteSpace(path) && System.IO.File.Exists(path))
                return path;

            // Try preferred local file (root of repo)
            var preferred = _config["InterviewSync:PreferredLocalFile"] ?? "Interview Software.xlsx";
            var rootPath = Path.Combine(Directory.GetCurrentDirectory(), "..", preferred);
            if (System.IO.File.Exists(rootPath)) return rootPath;

            // Try same directory
            var sameDirPath = Path.Combine(Directory.GetCurrentDirectory(), preferred);
            if (System.IO.File.Exists(sameDirPath)) return sameDirPath;

            return rootPath; // return preferred path even if missing (caller checks existence)
        }

        // ─── GET /api/feedback ───────────────────────────────────────────────
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string search = null,
            [FromQuery] string recommendation = null,
            [FromQuery] string stack = null)
        {
            var user = GetCurrentUser();
            if (user == null) return Unauthorized(new { message = "Unauthenticated" });

            try
            {
                var spreadsheetId = _config["GoogleSheets:SpreadsheetId"] ?? "1ucpwjWi8KaKDLjUx5QnoUUssXk9HhYPvfxzAfPj4jL0";
                var rows = await _sheetsService.ReadAllRowsAsync(spreadsheetId, "Interview Feedback");

                // Load full interview data from Excel (the in-memory DB may be empty when SQL is offline)
                var excelFilePath = GetExcelFilePath();
                List<Interview> interviews;
                if (System.IO.File.Exists(excelFilePath))
                {
                    var parsed = SeedHelper.ParseInterviewFile(excelFilePath);
                    interviews = parsed.Select(SeedHelper.MapParsedRow)
                                       .Where(x => !string.IsNullOrWhiteSpace(x.IntervieweeName))
                                       .ToList();
                }
                else
                {
                    // Fall back to DB if Excel not found
                    interviews = await _context.Interviews.AsNoTracking().ToListAsync();
                }

                // Load all existing database feedbacks to match IDs
                var dbFeedbacks = await _context.InterviewFeedbacks.AsNoTracking().ToListAsync();
                var assignedIds = new HashSet<int>();

                var feedbackOnlyRows = new List<SheetsFeedbackDto>();

                for (int i = 0; i < rows.Count; i++)
                {
                    var row = rows[i];
                    if (row == null || row.Count == 0) continue;

                    // Skip header row
                    var col0 = row.Count > 0 ? row[0]?.ToString()?.Trim() ?? "" : "";
                    var col2 = row.Count > 2 ? row[2]?.ToString()?.Trim() ?? "" : "";

                    if (col0.Equals("Sr", StringComparison.OrdinalIgnoreCase) || 
                        col0.Equals("Sr.", StringComparison.OrdinalIgnoreCase) ||
                        col2.Equals("Interviewee", StringComparison.OrdinalIgnoreCase) ||
                        col2.Equals("Candidate Name", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    // Skip if interviewee name (Column C, index 2) is missing
                    if (string.IsNullOrEmpty(col2))
                        continue;

                    int? srVal = null;
                    if (int.TryParse(col0, out var parsedSr))
                        srVal = parsedSr;

                    string GetValue(int index) =>
                        row.Count > index ? row[index]?.ToString()?.Trim() ?? "" : "";

                    // Find matching interview in local DB (mirrors Excel)
                    Interview match = null;
                    if (srVal.HasValue)
                    {
                        match = interviews.FirstOrDefault(x => x.Sr == srVal.Value);
                    }

                    if (match == null)
                    {
                        var candidateLower = col2.Trim().ToLower();
                        var interviewDateStr = GetValue(1);
                        DateTime? parsedDate = null;
                        if (DateTime.TryParse(interviewDateStr, out var pd))
                            parsedDate = pd;

                        match = interviews.FirstOrDefault(x => 
                            (x.IntervieweeName ?? "").Trim().ToLower() == candidateLower &&
                            (!parsedDate.HasValue || x.InterviewDate == parsedDate.Value));

                        if (match == null)
                        {
                            var companyLower = GetValue(4).Trim().ToLower();
                            match = interviews.FirstOrDefault(x => 
                                (x.IntervieweeName ?? "").Trim().ToLower() == candidateLower &&
                                (x.CompanyName ?? "").Trim().ToLower() == companyLower);
                        }
                    }

                    var finalSr           = match?.Sr ?? srVal;
                    var finalDate         = match?.InterviewDate?.ToString("dd-MMM-yyyy") ?? GetValue(1);
                    var finalInterviewee  = match?.IntervieweeName ?? col2;
                    var finalInterviewer  = match?.JobHunterName ?? GetValue(3);
                    var finalCompany      = match?.CompanyName ?? GetValue(4);
                    var finalType         = match?.InterviewType ?? GetValue(5);
                    var finalStatus       = match?.Status ?? GetValue(6);
                    var finalInvTo        = match?.InvTo ?? GetValue(7);
                    var finalInterviewFor = match?.InterviewFor ?? GetValue(8);
                    var finalJobStartDate = match?.JobStartDate?.ToString("dd-MMM-yyyy") ?? GetValue(9);

                    // Find matching InterviewFeedback record in local DB to get its correct database Id
                    InterviewFeedback dbMatch = null;
                    if (finalSr.HasValue)
                    {
                        dbMatch = dbFeedbacks.FirstOrDefault(x => x.Sr == finalSr.Value);
                    }
                    if (dbMatch == null)
                    {
                        var candidateLower = finalInterviewee.Trim().ToLower();
                        var companyLower = finalCompany.Trim().ToLower();
                        var typeLower = finalType.Trim().ToLower();
                        dbMatch = dbFeedbacks.FirstOrDefault(x => 
                            (x.IntervieweeName ?? "").Trim().ToLower() == candidateLower &&
                            (x.CompanyName ?? "").Trim().ToLower() == companyLower &&
                            (x.InterviewType ?? "").Trim().ToLower() == typeLower);
                    }

                    int rowId;
                    if (dbMatch != null && !assignedIds.Contains(dbMatch.Id))
                    {
                        rowId = dbMatch.Id;
                    }
                    else
                    {
                        rowId = 100000 + i;
                    }
                    assignedIds.Add(rowId);

                    feedbackOnlyRows.Add(new SheetsFeedbackDto
                    {
                        Id              = rowId,
                        Sr              = finalSr,
                        InterviewDate   = finalDate,
                        IntervieweeName = finalInterviewee,
                        InterviewerName = finalInterviewer,
                        CompanyName     = finalCompany,
                        InterviewType   = finalType,
                        Status          = finalStatus,
                        InvTo           = finalInvTo,
                        InterviewFor    = finalInterviewFor,
                        JobStartDate    = finalJobStartDate,
                        Stack           = match?.Stack,
                        EnglishFeedback = GetValue(18),
                        Recommendation  = GetValue(19)
                    });
                }

                var filteredList = feedbackOnlyRows.AsEnumerable();

                // Role-based filtering: Admin sees all, others see their own
                if (!IsAdmin(user))
                {
                    if (string.IsNullOrWhiteSpace(user.InterviewName))
                        return Ok(new List<SheetsFeedbackDto>());

                    var interviewName = user.InterviewName.Trim().ToLower();

                    if (string.Equals(user.RoleName, "Interviewee", StringComparison.OrdinalIgnoreCase))
                    {
                        filteredList = filteredList.Where(j => (j.IntervieweeName ?? "").Trim().ToLower() == interviewName);
                    }
                    else if (string.Equals(user.RoleName, "Job Hunter", StringComparison.OrdinalIgnoreCase))
                    {
                        filteredList = filteredList.Where(j => (j.InterviewerName ?? "").Trim().ToLower() == interviewName);
                    }
                    else if (string.Equals(user.RoleName, "Both", StringComparison.OrdinalIgnoreCase))
                    {
                        filteredList = filteredList.Where(j => 
                            (j.IntervieweeName ?? "").Trim().ToLower() == interviewName ||
                            (j.InterviewerName ?? "").Trim().ToLower() == interviewName
                        );
                    }
                    else
                    {
                        return Ok(new List<SheetsFeedbackDto>());
                    }
                }

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var s = search.Trim().ToLower();
                    filteredList = filteredList.Where(j =>
                        (j.IntervieweeName ?? "").ToLower().Contains(s) ||
                        (j.InterviewerName ?? "").ToLower().Contains(s) ||
                        (j.CompanyName ?? "").ToLower().Contains(s)
                    );
                }

                if (!string.IsNullOrWhiteSpace(recommendation) &&
                    !string.Equals(recommendation, "All", StringComparison.OrdinalIgnoreCase))
                {
                    filteredList = filteredList.Where(j =>
                        string.Equals(j.Recommendation, recommendation, StringComparison.OrdinalIgnoreCase)
                    );
                }

                if (!string.IsNullOrWhiteSpace(stack) &&
                    !string.Equals(stack, "All", StringComparison.OrdinalIgnoreCase))
                {
                    filteredList = filteredList.Where(j =>
                        string.Equals(j.Stack, stack, StringComparison.OrdinalIgnoreCase)
                    );
                }

                // Sort by date descending
                var result = filteredList
                    .OrderByDescending(j => {
                        if (DateTime.TryParse(j.InterviewDate, out var dt))
                            return dt;
                        return DateTime.MinValue;
                    })
                    .ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ─── POST /api/feedback/cleanup-sheet ────────────────────────────────
        // Admin-only: Permanently deletes all rows in Google Sheets that have
        // no feedback text in Column S. Keeps the header + feedback rows only.
        [HttpPost("cleanup-sheet")]
        public async Task<IActionResult> CleanupSheet()
        {
            var user = GetCurrentUser();
            if (user == null) return Unauthorized(new { message = "Unauthenticated" });
            if (!IsAdmin(user)) return StatusCode(403, new { message = "Admin only." });

            var spreadsheetId = _config["GoogleSheets:SpreadsheetId"]
                                ?? "1ucpwjWi8KaKDLjUx5QnoUUssXk9HhYPvfxzAfPj4jL0";

            var (success, deletedCount, error) =
                await _sheetsService.DeleteRowsWithoutFeedbackAsync(spreadsheetId, "Interview Feedback");

            if (!success)
                return StatusCode(500, new { message = $"Cleanup failed: {error}" });

            return Ok(new
            {
                success      = true,
                deletedCount = deletedCount,
                message      = $"✅ Done. {deletedCount} empty rows removed from Google Sheet."
            });
        }

        // ─── GET /api/feedback/{id} ──────────────────────────────────────────
        [HttpGet("{id}")]
        public IActionResult GetById(int id)
        {
            var user = GetCurrentUser();
            if (user == null) return Unauthorized(new { message = "Unauthenticated" });

            var feedback = _context.InterviewFeedbacks.AsNoTracking().FirstOrDefault(f => f.Id == id);
            if (feedback == null) return NotFound(new { message = "Feedback not found" });
            return Ok(feedback);
        }

        // ─── POST /api/feedback ──────────────────────────────────────────────
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] FeedbackSaveDto model)
        {
            var user = GetCurrentUser();
            if (user == null) return Unauthorized(new { message = "Unauthenticated" });

            _logger.LogInformation("[Feedback] Received submission — Sr={Sr}, Interviewee={Name}, Company={Co}",
                model.Sr, model.IntervieweeName, model.CompanyName);

            try
            {
                // ── 0. Duplicate Sr guard — reject if this Sr already has feedback ──
                if (model.Sr.HasValue && model.Sr.Value > 0)
                {
                    var srExists = await _context.InterviewFeedbacks
                        .AnyAsync(f => f.Sr == model.Sr.Value);

                    if (srExists)
                    {
                        _logger.LogWarning("[Feedback] Duplicate blocked — Sr={Sr} already has feedback.", model.Sr);
                        return Conflict(new
                        {
                            success = false,
                            message = $"Feedback for interview Sr {model.Sr} has already been submitted."
                        });
                    }
                }

                // ── 1. Save to DB ─────────────────────────────────────────────
                var feedback = new InterviewFeedback
                {
                    Sr              = model.Sr,
                    InterviewerName = model.InterviewerName,
                    IntervieweeName = model.IntervieweeName,
                    CompanyName     = model.CompanyName,
                    InterviewType   = model.InterviewType,
                    InterviewDate   = model.InterviewDate,
                    AudioFileUrl    = model.AudioFileUrl,
                    UrduTranscript  = model.UrduTranscript,
                    EnglishFeedback = model.EnglishFeedback,
                    Communication   = model.Communication,
                    TechnicalSkills = model.TechnicalSkills,
                    Strengths       = model.Strengths,
                    Weaknesses      = model.Weaknesses,
                    Recommendation  = model.Recommendation,
                    Rating          = model.Rating,
                    FeedbackBy      = model.FeedbackBy,
                    FeedbackDate    = model.FeedbackDate,
                    CreatedAt       = DateTime.UtcNow
                };

                _context.InterviewFeedbacks.Add(feedback);
                await _context.SaveChangesAsync();
                _logger.LogInformation("[Feedback] Saved to DB (Id={Id}, Sr={Sr})", feedback.Id, feedback.Sr);

                // ── 2. Sync to Google Sheets (non-fatal) ─────────────────────
                try
                {
                    var sheetRow = new InterviewFeedbackRow
                    {
                        Sr                 = feedback.Sr ?? 0,   // ← pass the SELECTED Sr
                        CandidateName      = feedback.IntervieweeName,
                        CompanyName        = feedback.CompanyName,
                        InterviewType      = feedback.InterviewType,
                        InterviewerName    = feedback.InterviewerName,
                        InterviewDate      = feedback.InterviewDate?.ToString("dd-MMM-yyyy") ?? "",
                        AiProcessedFeedback = feedback.EnglishFeedback,
                        FeedbackText       = feedback.EnglishFeedback,
                        Recommendation     = feedback.Recommendation,
                        Rating             = feedback.Rating,
                        Strengths          = feedback.Strengths,
                        Weaknesses         = feedback.Weaknesses,
                        FeedbackBy         = feedback.FeedbackBy,
                        FeedbackDate       = feedback.FeedbackDate
                    };

                    var (sheetOk, sheetErr) = await _sheetsService.SyncInterviewFeedbackToSheetAsync(sheetRow);

                    if (sheetOk)
                        _logger.LogInformation("[Feedback] Google Sheets synced (Sr={Sr})", feedback.Sr);
                    else
                        _logger.LogError("[Feedback] Google Sheets sync failed (Sr={Sr}): {Error}", feedback.Sr, sheetErr);

                    return Ok(new
                    {
                        success      = true,
                        data         = feedback,
                        sheetSynced  = sheetOk,
                        sheetMessage = sheetOk
                            ? "Synced to Google Sheets."
                            : $"Saved, but Google Sheet sync failed: {sheetErr}"
                    });
                }
                catch (Exception sheetEx)
                {
                    _logger.LogError(sheetEx, "[Feedback] Google Sheets exception (Sr={Sr}): {Error}",
                        feedback.Sr, sheetEx.Message);
                }

                return Ok(new
                {
                    success      = true,
                    data         = feedback,
                    sheetSynced  = false,
                    sheetMessage = "Saved to database, but Google Sheet sync failed."
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ─── DELETE /api/feedback/{id} ───────────────────────────────────────
        [HttpDelete("{id}")]
        public IActionResult Delete(int id)
        {
            var user = GetCurrentUser();
            if (user == null) return Unauthorized(new { message = "Unauthenticated" });
            if (!IsAdmin(user)) return Forbid();

            var feedback = _context.InterviewFeedbacks.FirstOrDefault(f => f.Id == id);
            if (feedback == null) return NotFound(new { message = "Feedback not found" });

            _context.InterviewFeedbacks.Remove(feedback);
            _context.SaveChanges();
            return Ok(new { message = "Deleted successfully" });
        }

        // ─── POST /api/feedback/transcribe ──────────────────────────────────
        [HttpPost("transcribe")]
        [RequestSizeLimit(50_000_000)] // 50 MB limit
        public async Task<IActionResult> Transcribe(IFormFile audio)
        {
            var user = GetCurrentUser();
            if (user == null) return Unauthorized(new { message = "Unauthenticated" });

            if (audio == null || audio.Length == 0)
                return BadRequest(new { message = "No audio file provided" });

            var apiKey = _config["AI:GroqKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
                return BadRequest(new { message = "Groq API key not configured. Add 'AI:GroqKey' to appsettings.json" });

            try
            {
                // Save the audio to disk
                var uploadDir = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "audio-uploads");
                Directory.CreateDirectory(uploadDir);
                var fileName = $"{Guid.NewGuid()}{Path.GetExtension(audio.FileName) ?? ".webm"}";
                var filePath = Path.Combine(uploadDir, fileName);

                await using (var fs = new FileStream(filePath, FileMode.Create))
                    await audio.CopyToAsync(fs);

                var audioFileUrl = $"/audio-uploads/{fileName}";

                // Call Groq API (Whisper)
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

                using var formData = new MultipartFormDataContent();
                await using var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read);
                var streamContent = new StreamContent(fileStream);
                streamContent.Headers.ContentType = new MediaTypeHeaderValue(audio.ContentType ?? "audio/webm");
                formData.Add(streamContent, "file", fileName);
                formData.Add(new StringContent("whisper-large-v3"), "model");
                formData.Add(new StringContent("ur"), "language"); // Urdu
                formData.Add(new StringContent("text"), "response_format");

                var response = await client.PostAsync("https://api.groq.com/openai/v1/audio/transcriptions", formData);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                    return StatusCode(500, new { error = $"Groq API error ({response.StatusCode})", detail = responseBody });

                var text = responseBody.Trim();
                _logger.LogInformation("Whisper returned: {text}", text);

                return Ok(new { transcript = text, audioFileUrl });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in feedback endpoint");
                return StatusCode(500, new { error = ex.Message, detail = ex.InnerException?.Message });
            }
        }

        [HttpPost("enhance")]
        public async Task<IActionResult> EnhanceFeedback([FromBody] EnhanceRequestDto request)
        {
            try
            {
                var groqKey = _config["AI:GroqKey"];
                if (string.IsNullOrEmpty(groqKey))
                    return BadRequest(new { error = "Groq API key not configured" });

                using var httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {groqKey}");

                var body = new
                {
                    model = "llama-3.1-8b-instant",
                    temperature = 0.1,
                    messages = new[]
                    {
                        new {
                            role = "system",
                            content = "You are a professional Urdu-to-English translator."
                        },
                        new {
                            role = "user",
                            content = $"Translate the following Urdu text to professional English. Output ONLY the English translation, nothing else.\n\nUrdu text:\n{request.UrduText}"
                        }
                    }
                };

                var json = JsonSerializer.Serialize(body);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await httpClient.PostAsync(
                    "https://api.groq.com/openai/v1/chat/completions", content);

                var responseString = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                    return StatusCode(500, new { error = "Groq error", detail = responseString });

                var groqResult = JsonSerializer.Deserialize<JsonElement>(responseString);
                var translatedText = groqResult
                    .GetProperty("choices")[0]
                    .GetProperty("message")
                    .GetProperty("content")
                    .GetString()?.Trim();

                return Ok(new { translatedText });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in feedback endpoint");
                return StatusCode(500, new {
                    error = ex.Message,
                    detail = ex.InnerException?.Message
                });
            }
        }

        // ─── GET /api/feedback/dropdowns ─────────────────────────────────────
        [HttpGet("dropdowns")]
        public IActionResult GetDropdowns()
        {
            var user = GetCurrentUser();
            if (user == null) return Unauthorized(new { message = "Unauthenticated" });

            try
            {
                // Get unique interviewees from interviews table
                var interviewees = _context.Interviews
                    .AsNoTracking()
                    .Where(i => !string.IsNullOrWhiteSpace(i.IntervieweeName))
                    .Select(i => new { name = i.IntervieweeName.Trim(), company = i.CompanyName.Trim() })
                    .AsEnumerable()
                    .GroupBy(i => i.name.ToLower())
                    .Select(g =>
                    {
                        var first = g.First();
                        return new { name = first.name, company = first.company };
                    })
                    .OrderBy(i => i.name)
                    .ToList();

                // Get users/interviewers
                var interviewers = AuthHelper.GetAllUsers()
                    .Select(u => new { username = u.Username, fullName = u.FullName ?? u.Username })
                    .OrderBy(u => u.fullName)
                    .ToList();

                return Ok(new { interviewees, interviewers });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        private string SafeGetString(JsonElement el, string key)
        {
            try { return el.GetProperty(key).GetString(); } catch { return ""; }
        }
    }

    // ─── DTOs ────────────────────────────────────────────────────────────────
    public class FeedbackSaveDto
    {
        /// <summary>Sr number from the selected interview dropdown. This is the unique key per interview.</summary>
        public int? Sr { get; set; }
        public string InterviewerName { get; set; }
        public string IntervieweeName { get; set; }
        public string CompanyName { get; set; }
        public string InterviewType { get; set; }
        public DateTime? InterviewDate { get; set; }
        public string AudioFileUrl { get; set; }
        public string UrduTranscript { get; set; }
        public string EnglishFeedback { get; set; }
        public string Communication { get; set; }
        public string TechnicalSkills { get; set; }
        public string Strengths { get; set; }
        public string Weaknesses { get; set; }
        public string Recommendation { get; set; }
        public int Rating { get; set; }
        public string FeedbackBy { get; set; }
        public string FeedbackDate { get; set; }
    }

    public class SheetsFeedbackDto
    {
        public int Id { get; set; }
        public int? Sr { get; set; }
        public string InterviewDate { get; set; }
        public string IntervieweeName { get; set; }
        public string InterviewerName { get; set; }
        public string CompanyName { get; set; }
        public string InterviewType { get; set; }
        public string Status { get; set; }
        public string InvTo { get; set; }
        public string InterviewFor { get; set; }
        public string JobStartDate { get; set; }
        public string Stack { get; set; }
        public string EnglishFeedback { get; set; }
        public string Recommendation { get; set; }
    }

    public class EnhanceRequestDto
    {
        public string UrduText { get; set; }
    }
}
