using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Services;
using Google.Apis.Sheets.v4;
using Google.Apis.Sheets.v4.Data;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RizvizERP.API.Models;
using RizvizERP.API.Controllers;

namespace RizvizERP.API.Services
{
    public class GoogleSheetsService : IGoogleSheetsService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<GoogleSheetsService> _logger;

        // Scopes required for writing
        private static readonly string[] Scopes = { SheetsService.Scope.Spreadsheets };

        public GoogleSheetsService(IConfiguration config, ILogger<GoogleSheetsService> logger)
        {
            _config = config;
            _logger = logger;
        }

        // ── Credential helper: file path first, then env-var JSON ────────────
        private async Task<GoogleCredential> GetCredentialAsync()
        {
            var credPath = _config["GoogleSheets:CredentialsPath"] ?? "credentials.json";
            if (File.Exists(credPath))
            {
                await using var stream = new FileStream(credPath, FileMode.Open, FileAccess.Read);
                return GoogleCredential.FromStream(stream).CreateScoped(Scopes);
            }

            // Fallback: load from environment variable (Railway secret)
            var credJson = Environment.GetEnvironmentVariable("GOOGLE_CREDENTIALS_JSON")
                        ?? _config["GoogleSheets:CredentialsJson"];
            if (!string.IsNullOrWhiteSpace(credJson))
            {
                using var ms = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(credJson));
                return GoogleCredential.FromStream(ms).CreateScoped(Scopes);
            }

            throw new FileNotFoundException(
                $"Google credentials not found. Set GOOGLE_CREDENTIALS_JSON env var or place credentials.json at '{credPath}'.");
        }

        private bool HasCredentials()
        {
            var credPath = _config["GoogleSheets:CredentialsPath"] ?? "credentials.json";
            if (File.Exists(credPath)) return true;
            var credJson = Environment.GetEnvironmentVariable("GOOGLE_CREDENTIALS_JSON")
                        ?? _config["GoogleSheets:CredentialsJson"];
            return !string.IsNullOrWhiteSpace(credJson);
        }

        public async Task<(bool Success, string Error)> AppendFeedbackAsync(GeneralFeedback feedback)
        {
            var credPath = _config["GoogleSheets:CredentialsPath"];
            var spreadsheetId = _config["GoogleSheets:SpreadsheetId"];
            var sheetName = _config["GoogleSheets:GeneralSheetName"] ?? "General Feedback";

            // ── Guard: missing configuration ─────────────────────────────────
            if (string.IsNullOrWhiteSpace(spreadsheetId))
            {
                const string msg = "Google Sheets not configured (missing SpreadsheetId). Skipping sheet sync.";
                _logger.LogWarning(msg);
                return (false, msg);
            }

            if (!HasCredentials())
            {
                const string msg = "Google credentials not available (no credentials.json and GOOGLE_CREDENTIALS_JSON env var not set). Skipping sheet sync.";
                _logger.LogWarning(msg);
                return (false, msg);
            }

            // ── Retry logic (up to 3 attempts) ───────────────────────────────
            const int maxAttempts = 3;
            string lastError = null;

            for (int attempt = 1; attempt <= maxAttempts; attempt++)
            {
                try
                {
                    // Build authenticated Sheets service
                    var credential = await GetCredentialAsync();

                    var service = new SheetsService(new BaseClientService.Initializer
                    {
                        HttpClientInitializer = credential,
                        ApplicationName = "RizvizERP Feedback"
                    });

                    // Build row: Name | Email | Message | Timestamp (UTC ISO)
                    var row = new List<object>
                    {
                        feedback.Name,
                        feedback.Email,
                        feedback.Message,
                        feedback.Timestamp.ToString("yyyy-MM-dd HH:mm:ss") + " UTC"
                    };

                    var body = new ValueRange { Values = new List<IList<object>> { row } };
                    var range = $"{sheetName}!A:D";

                    var request = service.Spreadsheets.Values.Append(body, spreadsheetId, range);
                    request.ValueInputOption =
                        SpreadsheetsResource.ValuesResource.AppendRequest.ValueInputOptionEnum.USERENTERED;

                    var response = await request.ExecuteAsync();

                    _logger.LogInformation(
                        "Google Sheets append succeeded on attempt {Attempt}. " +
                        "Updated range: {Range}",
                        attempt, response.Updates?.UpdatedRange);

                    return (true, null);
                }
                catch (Exception ex)
                {
                    lastError = ex.Message;
                    _logger.LogWarning(
                        ex,
                        "Google Sheets append failed on attempt {Attempt}/{MaxAttempts}: {Error}",
                        attempt, maxAttempts, ex.Message);

                    if (attempt < maxAttempts)
                        await Task.Delay(TimeSpan.FromSeconds(attempt * 2)); // back-off: 2s, 4s
                }
            }

            _logger.LogError(
                "Google Sheets append failed after {MaxAttempts} attempts. Last error: {Error}",
                maxAttempts, lastError);

            return (false, $"Sheet sync failed after {maxAttempts} attempts: {lastError}");
        }

        public async Task<(bool Success, string Error)> AppendInterviewFeedbackAsync(InterviewFeedbackRow row)
        {
            var credPath = _config["GoogleSheets:CredentialsPath"];
            var spreadsheetId = _config["GoogleSheets:SpreadsheetId"];
            var sheetName = _config["GoogleSheets:SheetName"] ?? "Sheet1";

            if (string.IsNullOrWhiteSpace(spreadsheetId))
            {
                const string msg = "Google Sheets not configured (missing SpreadsheetId). Skipping sync.";
                _logger.LogWarning(msg);
                return (false, msg);
            }

            if (!HasCredentials())
            {
                const string msg = "Google credentials not available. Skipping sync.";
                _logger.LogWarning(msg);
                return (false, msg);
            }

            const int maxAttempts = 3;
            string lastError = null;

            for (int attempt = 1; attempt <= maxAttempts; attempt++)
            {
                try
                {
                    var credential = await GetCredentialAsync();

                    var service = new SheetsService(new BaseClientService.Initializer
                    {
                        HttpClientInitializer = credential,
                        ApplicationName = "RizvizERP Feedback"
                    });

                    // 1. Check if sheet is empty → write correct headers
                    // Correct column order:
                    // A=Id  B=Interviewee  C=Interviewer  D=Company  E=Type  F=Date  G=Recommendation  H=Feedback  I=FeedbackDate  J=Timestamp
                    var readRequest = service.Spreadsheets.Values.Get(spreadsheetId, $"{sheetName}!A1:J1");
                    var readResponse = await readRequest.ExecuteAsync();
                    if (readResponse.Values == null || readResponse.Values.Count == 0)
                    {
                        var headers = new List<object>
                        {
                            "Id", "Interviewee", "Interviewer", "Company", "Interview Type",
                            "Interview Date", "Recommendation", "AI Feedback", "Feedback Date", "Timestamp"
                        };
                        var headerBody = new ValueRange { Values = new List<IList<object>> { headers } };
                        var headerAppend = service.Spreadsheets.Values.Append(headerBody, spreadsheetId, $"{sheetName}!A1");
                        headerAppend.ValueInputOption = SpreadsheetsResource.ValuesResource.AppendRequest.ValueInputOptionEnum.USERENTERED;
                        await headerAppend.ExecuteAsync();
                    }

                    // 2. Build row — fixed column order
                    var rowData = new List<object>
                    {
                        Guid.NewGuid().ToString(),          // A = Id
                        row.CandidateName ?? "",            // B = Interviewee
                        row.InterviewerName ?? "",          // C = Interviewer
                        row.CompanyName ?? "",              // D = Company
                        row.InterviewType ?? "",            // E = Interview Type
                        row.InterviewDate ?? "",            // F = Interview Date
                        row.Recommendation ?? "",           // G = Recommendation
                        row.AiProcessedFeedback ?? "",      // H = AI Feedback
                        row.FeedbackDate ?? DateTime.UtcNow.ToString("yyyy-MM-dd"), // I = Feedback Date
                        DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss") + " UTC"  // J = Timestamp
                    };

                    var body = new ValueRange { Values = new List<IList<object>> { rowData } };
                    var range = $"{sheetName}!A:J";

                    var request = service.Spreadsheets.Values.Append(body, spreadsheetId, range);
                    request.ValueInputOption = SpreadsheetsResource.ValuesResource.AppendRequest.ValueInputOptionEnum.USERENTERED;

                    var response = await request.ExecuteAsync();
                    _logger.LogInformation("Interview Feedback appended to Google Sheet. Range: {Range}", response.Updates?.UpdatedRange);

                    return (true, null);
                }
                catch (Exception ex)
                {
                    lastError = ex.Message;
                    _logger.LogWarning(ex, "Failed to append interview feedback to Google Sheet (attempt {Attempt}/{MaxAttempts}): {Error}", attempt, maxAttempts, ex.Message);
                    if (attempt < maxAttempts)
                        await Task.Delay(TimeSpan.FromSeconds(attempt * 2));
                }
            }

            return (false, $"Failed to sync interview feedback after {maxAttempts} attempts: {lastError}");
        }

        public async Task<(bool Success, string Error)> AppendRowAsync(string spreadsheetId, string sheetName, List<string> rowData)
        {
            try
            {
                _logger.LogInformation("Appending to Google Sheets: {Data}", string.Join(", ", rowData));

                var credential = await GetCredentialAsync();

                var service = new SheetsService(new BaseClientService.Initializer
                {
                    HttpClientInitializer = credential,
                    ApplicationName = "RizvizERP Feedback"
                });

                var values = rowData.Select(val => (object)(val ?? "")).ToList();
                var body = new ValueRange { Values = new List<IList<object>> { values } };
                var range = $"{sheetName}!A:V";

                var request = service.Spreadsheets.Values.Append(body, spreadsheetId, range);
                request.ValueInputOption =
                    SpreadsheetsResource.ValuesResource.AppendRequest.ValueInputOptionEnum.USERENTERED;

                var response = await request.ExecuteAsync();
                _logger.LogInformation("Google Sheets append success: {Result}", response.Updates?.UpdatedRange);
                return (true, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Google Sheets append FAILED: {Msg}", ex.Message);
                return (false, ex.Message);
            }
        }

        public async Task<IList<IList<object>>> ReadAllRowsAsync(string spreadsheetId, string sheetName)
        {
            try
            {
                var credential = await GetCredentialAsync();

                var service = new SheetsService(new BaseClientService.Initializer
                {
                    HttpClientInitializer = credential,
                    ApplicationName = "RizvizERP Feedback"
                });

                await EnsureSheetExistsAsync(service, spreadsheetId, sheetName);

                var range = $"{sheetName}!A:V";
                var request = service.Spreadsheets.Values.Get(spreadsheetId, range);
                var response = await request.ExecuteAsync();

                _logger.LogInformation("[ReadAllRowsAsync] Read {Count} rows from sheet '{Sheet}'.",
                    response.Values?.Count ?? 0, sheetName);

                return response.Values ?? new List<IList<object>>();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[ReadAllRowsAsync] Failed to read rows from Google Sheet: {Error}", ex.Message);
                return new List<IList<object>>();
            }
        }

        private async Task EnsureSheetExistsAsync(SheetsService service, string spreadsheetId, string sheetName)
        {
            try
            {
                var spreadsheet = await service.Spreadsheets.Get(spreadsheetId).ExecuteAsync();
                var exists = false;
                if (spreadsheet.Sheets != null)
                {
                    foreach (var s in spreadsheet.Sheets)
                    {
                        if (string.Equals(s.Properties?.Title, sheetName, StringComparison.OrdinalIgnoreCase))
                        {
                            exists = true;
                            break;
                        }
                    }
                }

                if (!exists)
                {
                    var addRequest = new Request
                    {
                        AddSheet = new AddSheetRequest
                        {
                            Properties = new SheetProperties { Title = sheetName }
                        }
                    };
                    var batchUpdate = new BatchUpdateSpreadsheetRequest
                    {
                        Requests = new List<Request> { addRequest }
                    };
                    await service.Spreadsheets.BatchUpdate(batchUpdate, spreadsheetId).ExecuteAsync();
                    _logger.LogInformation("[EnsureSheetExists] Created sheet tab '{SheetName}'", sheetName);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[EnsureSheetExists] Failed to check/create sheet tab '{SheetName}': {Error}", sheetName, ex.Message);
            }
        }

        public async Task<(bool Success, string Error)> SyncExcelToSheetsAsync()
        {
            _logger.LogInformation("[SyncExcelToSheets] Skipped automatic sync of all Excel rows to Google Sheets, keeping the sheet clean.");
            return (true, null);
        }

        public async Task<(bool Success, string Error)> SyncInterviewFeedbackToSheetAsync(InterviewFeedbackRow row)
        {
            _logger.LogInformation(
                "[SyncInterviewFeedback] Appending new feedback row for {Candidate} / {Company} / {Type} (Sr={Sr})",
                row.CandidateName, row.CompanyName, row.InterviewType, row.Sr);

            // ── Guard: check if this Sr already exists in the sheet ──────────
            if (row.Sr > 0)
            {
                try
                {
                    var spreadsheetId = _config["GoogleSheets:SpreadsheetId"];
                    var sheetName     = _config["GoogleSheets:SheetName"] ?? "Interview Feedback";
                    var existingRows  = await ReadAllRowsAsync(spreadsheetId, sheetName);

                    bool srAlreadyInSheet = existingRows.Any(r =>
                        r != null && r.Count > 0 &&
                        int.TryParse(r[0]?.ToString()?.Trim(), out var existingSr) &&
                        existingSr == row.Sr);

                    if (srAlreadyInSheet)
                    {
                        _logger.LogWarning(
                            "[SyncInterviewFeedback] ⚠ Sr={Sr} already exists in Google Sheet — skipping duplicate append.",
                            row.Sr);
                        // Return success (no error) — the row is already there
                        return (true, null);
                    }
                }
                catch (Exception checkEx)
                {
                    _logger.LogWarning(checkEx,
                        "[SyncInterviewFeedback] Could not pre-check sheet for Sr={Sr}, proceeding with append: {Error}",
                        row.Sr, checkEx.Message);
                }
            }

            // Always append — each Sr = unique interview = unique row.
            var feedbackText = row.AiProcessedFeedback ?? row.FeedbackText ?? "";
            var (appendOk, appendErr) = await AppendMasterSheetFeedbackRowAsync(row, feedbackText);
            if (appendOk)
            {
                _logger.LogInformation("[SyncInterviewFeedback] ✅ New feedback row appended to Google Sheets (Sr={Sr}).", row.Sr);
                return (true, null);
            }

            _logger.LogError("[SyncInterviewFeedback] ❌ Append FAILED (Sr={Sr}): {Error}", row.Sr, appendErr);
            return (false, appendErr);
        }

        private async Task<(bool Success, string Error)> AppendMasterSheetFeedbackRowAsync(
            InterviewFeedbackRow row, string feedbackText)
        {
            var spreadsheetId = _config["GoogleSheets:SpreadsheetId"];
            var sheetName = _config["GoogleSheets:SheetName"] ?? "Interview Feedback";

            if (string.IsNullOrWhiteSpace(spreadsheetId))
                return (false, "Google Sheets SpreadsheetId not configured.");

            try
            {
                var credential = await GetCredentialAsync();

                var service = new SheetsService(new BaseClientService.Initializer
                {
                    HttpClientInitializer = credential,
                    ApplicationName = "RizvizERP Feedback"
                });

                await EnsureSheetExistsAsync(service, spreadsheetId, sheetName);

                var readRange = $"{sheetName}!A1:V1";
                var getRequest = service.Spreadsheets.Values.Get(spreadsheetId, readRange);
                var getResponse = await getRequest.ExecuteAsync();
                if (getResponse.Values == null || getResponse.Values.Count == 0)
                {
                    var headers = new List<object>
                    {
                        "Sr.", "Date", "Interviewee", "Job Hunter", "Company", "Interview Type", "Status",
                        "Inv. To", "Interview For", "Job Start Date", "Job Close Date", "1st Salary", "JH Suggest",
                        "Interview Charges", "JH Due", "1st Pmnt on Job", "2nd Pmnt on Job", "Bal. Payable",
                        "Feedback", "Recommendation", "Feedback Date", "Feedback Time"
                    };
                    var headerBody = new ValueRange { Values = new List<IList<object>> { headers } };
                    var appendHeader = service.Spreadsheets.Values.Append(headerBody, spreadsheetId, $"{sheetName}!A1");
                    appendHeader.ValueInputOption = SpreadsheetsResource.ValuesResource.AppendRequest.ValueInputOptionEnum.USERENTERED;
                    await appendHeader.ExecuteAsync();
                }

                // Match with Excel row
                var match = FindExcelMatch(row.Sr, row.CandidateName, row.CompanyName, row.InterviewType, row.InterviewDate);

                var now = DateTime.UtcNow;
                var rowData = new List<object>
                {
                    match?.Sr?.ToString() ?? (row.Sr > 0 ? row.Sr.ToString() : ""), // Column A (index 0, Sr)
                    match?.InterviewDate?.ToString("dd-MMM-yyyy") ?? row.InterviewDate ?? "", // Column B (index 1, Date)
                    match?.IntervieweeName ?? row.CandidateName ?? "", // Column C (index 2, Interviewee)
                    match?.JobHunterName ?? row.InterviewerName ?? "", // Column D (index 3, Job Hunter)
                    match?.CompanyName ?? row.CompanyName ?? "", // Column E (index 4, Company)
                    match?.InterviewType ?? row.InterviewType ?? "", // Column F (index 5, Interview Type)
                    match?.Status ?? "", // Column G (index 6, Status)
                    match?.InvTo ?? "", // Column H (index 7, Inv. To)
                    match?.InterviewFor ?? "", // Column I (index 8, Interview For)
                    match?.JobStartDate?.ToString("dd-MMM-yyyy") ?? "", // Column J (index 9, Job Start Date)
                    match?.JobCloseDate?.ToString("dd-MMM-yyyy") ?? "", // Column K (index 10, Job Close Date)
                    match?.FirstSalary ?? "", // Column L (index 11, 1st Salary)
                    match?.JhSuggest ?? "", // Column M (index 12, JH Suggest)
                    (match != null && match.InterviewCharges != 0) ? match.InterviewCharges.ToString("F2") : "", // Column N (index 13, Interview Charges)
                    (match != null && match.JhDue != 0) ? match.JhDue.ToString("F2") : "", // Column O (index 14, JH Due)
                    (match != null && match.FirstPaymentOnJob != 0) ? match.FirstPaymentOnJob.ToString("F2") : "", // Column P (index 15, 1st Pmnt on Job)
                    (match != null && match.SecondPaymentOnJob != 0) ? match.SecondPaymentOnJob.ToString("F2") : "", // Column Q (index 16, 2nd Pmnt on Job)
                    (match != null && match.BalancePayable != 0) ? match.BalancePayable.ToString("F2") : "", // Column R (index 17, Bal. Payable)
                    feedbackText ?? "", // Column S (index 18, Feedback)
                    row.Recommendation ?? "", // Column T (index 19, Recommendation)
                    row.FeedbackDate ?? now.ToString("yyyy-MM-dd"), // Column U (index 20, Feedback Date)
                    now.ToString("HH:mm:ss") + " UTC" // Column V (index 21, Feedback Time)
                };

                var body = new ValueRange { Values = new List<IList<object>> { rowData } };
                var appendRequest = service.Spreadsheets.Values.Append(body, spreadsheetId, $"{sheetName}!A:V");
                appendRequest.ValueInputOption = SpreadsheetsResource.ValuesResource.AppendRequest.ValueInputOptionEnum.USERENTERED;
                var response = await appendRequest.ExecuteAsync();

                _logger.LogInformation(
                    "[AppendMasterSheetFeedbackRow] Appended feedback row. Range: {Range}",
                    response.Updates?.UpdatedRange);

                return (true, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[AppendMasterSheetFeedbackRow] Error: {Error}", ex.Message);
                return (false, ex.Message);
            }
        }

        /// <summary>
        /// Clears all data in Sheet1 (AI Feedback sheet) and writes a fresh header row.
        /// Called on startup when old/corrupted column layout is detected.
        /// </summary>
        public async Task<(bool Success, string Error)> ClearAndResetFeedbackSheetAsync()
        {
            var spreadsheetId = _config["GoogleSheets:SpreadsheetId"];
            const string sheetName = "Sheet1";

            if (string.IsNullOrWhiteSpace(spreadsheetId))
                return (false, "SpreadsheetId not configured.");

            try
            {
                var credential = await GetCredentialAsync();

                var service = new SheetsService(new BaseClientService.Initializer
                {
                    HttpClientInitializer = credential,
                    ApplicationName = "RizvizERP Feedback"
                });

                await EnsureSheetExistsAsync(service, spreadsheetId, sheetName);

                // Clear all data
                var clearRequest = service.Spreadsheets.Values.Clear(
                    new ClearValuesRequest(), spreadsheetId, $"{sheetName}!A:Z");
                await clearRequest.ExecuteAsync();

                // Write fresh header
                var headers = new List<object>
                {
                    "Id", "Interviewee", "Interviewer", "Company", "Interview Type",
                    "Interview Date", "Recommendation", "AI Feedback", "Feedback Date", "Timestamp"
                };
                var headerBody = new ValueRange { Values = new List<IList<object>> { headers } };
                var appendHeader = service.Spreadsheets.Values.Append(headerBody, spreadsheetId, $"{sheetName}!A1");
                appendHeader.ValueInputOption = SpreadsheetsResource.ValuesResource.AppendRequest.ValueInputOptionEnum.USERENTERED;
                await appendHeader.ExecuteAsync();

                _logger.LogInformation("[ClearAndResetFeedbackSheet] Sheet1 cleared and header written.");
                return (true, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ClearAndResetFeedbackSheet] Error: {Error}", ex.Message);
                return (false, ex.Message);
            }
        }

        private static string CopyExcelToTemp(string sourcePath)
        {
            var ext = Path.GetExtension(sourcePath);
            var tempPath = Path.Combine(Path.GetTempPath(), $"rizviz-sheets-sync-{Guid.NewGuid():N}{ext}");
            using (var src = new FileStream(sourcePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
            using (var dst = new FileStream(tempPath, FileMode.Create, FileAccess.Write, FileShare.None))
                src.CopyTo(dst);
            return tempPath;
        }

        public async Task<(bool Success, string Error)> UpdateInterviewFeedbackAsync(
            string intervieweeName, string companyName, string interviewType,
            string feedbackText, string recommendation)
        {
            var spreadsheetId = _config["GoogleSheets:SpreadsheetId"];
            var sheetName = _config["GoogleSheets:SheetName"] ?? "Interview Feedback";

            _logger.LogInformation(
                "[UpdateInterviewFeedback] Looking for row: Candidate='{Candidate}', Company='{Company}', Type='{Type}'",
                intervieweeName, companyName, interviewType);

            if (string.IsNullOrWhiteSpace(spreadsheetId))
            {
                return (false, "Google Sheets Spreadsheet ID not configured.");
            }

            try
            {
                var credential = await GetCredentialAsync();

                var service = new SheetsService(new BaseClientService.Initializer
                {
                    HttpClientInitializer = credential,
                    ApplicationName = "RizvizERP Feedback"
                });

                await EnsureSheetExistsAsync(service, spreadsheetId, sheetName);

                // Get all rows
                var readRange = $"{sheetName}!A:V";
                var getRequest = service.Spreadsheets.Values.Get(spreadsheetId, readRange);
                var getResponse = await getRequest.ExecuteAsync();
                var sheetRows = getResponse.Values;

                if (sheetRows == null || sheetRows.Count <= 1)
                {
                    _logger.LogWarning(
                        "[UpdateInterviewFeedback] Sheet '{Sheet}' is empty or has no data rows (count={Count}).",
                        sheetName, sheetRows?.Count ?? 0);
                    return (false, "Google Sheet is empty or contains no data rows.");
                }

                int bestRowIndex = -1;
                DateTime bestDate = DateTime.MinValue;

                // Loop through rows (skip header row 0)
                for (int i = 1; i < sheetRows.Count; i++)
                {
                    var row = sheetRows[i];
                    if (row == null || row.Count < 6) continue;

                    var candidate = row.Count > 2 ? row[2]?.ToString()?.Trim() : "";
                    var company = row.Count > 4 ? row[4]?.ToString()?.Trim() : "";
                    var type = row.Count > 5 ? row[5]?.ToString()?.Trim() : "";

                    if (string.Equals(candidate, intervieweeName, StringComparison.OrdinalIgnoreCase) &&
                        string.Equals(company, companyName, StringComparison.OrdinalIgnoreCase) &&
                        string.Equals(type, interviewType, StringComparison.OrdinalIgnoreCase))
                    {
                        var dateStr = row.Count > 1 ? row[1]?.ToString()?.Trim() : "";
                        var rowDate = SeedHelper.ParseExcelDate(dateStr) ?? DateTime.MinValue;

                        if (bestRowIndex == -1 || rowDate > bestDate)
                        {
                            bestRowIndex = i;
                            bestDate = rowDate;
                        }
                    }
                }

                if (bestRowIndex == -1)
                {
                    _logger.LogWarning(
                        "[UpdateInterviewFeedback] No matching row in '{Sheet}' for Candidate='{Candidate}', Company='{Company}', Type='{Type}'.",
                        sheetName, intervieweeName, companyName, interviewType);
                    return (false, $"No matching interview found for Candidate '{intervieweeName}', Company '{companyName}', Type '{interviewType}'.");
                }

                // Load Excel match to backfill G to R if missing
                var matchedExcel = FindExcelMatch(null, intervieweeName, companyName, interviewType, null);

                // Row number is 1-based index (index + 1)
                int rowNumber = bestRowIndex + 1;
                var now = DateTime.UtcNow;

                var updateValues = new List<IList<object>>
                {
                    new List<object>
                    {
                        matchedExcel?.Status ?? "", // G
                        matchedExcel?.InvTo ?? "", // H
                        matchedExcel?.InterviewFor ?? "", // I
                        matchedExcel?.JobStartDate?.ToString("dd-MMM-yyyy") ?? "", // J
                        matchedExcel?.JobCloseDate?.ToString("dd-MMM-yyyy") ?? "", // K
                        matchedExcel?.FirstSalary ?? "", // L
                        matchedExcel?.JhSuggest ?? "", // M
                        (matchedExcel != null && matchedExcel.InterviewCharges != 0) ? matchedExcel.InterviewCharges.ToString("F2") : "", // N
                        (matchedExcel != null && matchedExcel.JhDue != 0) ? matchedExcel.JhDue.ToString("F2") : "", // O
                        (matchedExcel != null && matchedExcel.FirstPaymentOnJob != 0) ? matchedExcel.FirstPaymentOnJob.ToString("F2") : "", // P
                        (matchedExcel != null && matchedExcel.SecondPaymentOnJob != 0) ? matchedExcel.SecondPaymentOnJob.ToString("F2") : "", // Q
                        (matchedExcel != null && matchedExcel.BalancePayable != 0) ? matchedExcel.BalancePayable.ToString("F2") : "", // R
                        feedbackText ?? "", // S
                        recommendation ?? "", // T
                        now.ToString("yyyy-MM-dd"), // U
                        now.ToString("HH:mm:ss") + " UTC" // V
                    }
                };

                var updateBody = new ValueRange { Values = updateValues };
                var updateRange = $"{sheetName}!G{rowNumber}:V{rowNumber}";

                var updateRequest = service.Spreadsheets.Values.Update(updateBody, spreadsheetId, updateRange);
                updateRequest.ValueInputOption = SpreadsheetsResource.ValuesResource.UpdateRequest.ValueInputOptionEnum.USERENTERED;
                await updateRequest.ExecuteAsync();

                _logger.LogInformation("[UpdateInterviewFeedback] Successfully updated row {Row} in Google Sheets for Candidate '{Candidate}'", rowNumber, intervieweeName);
                return (true, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[UpdateInterviewFeedback] Error: {Error}", ex.Message);
                return (false, ex.Message);
            }
        }

        // ─── DELETE ROWS WITHOUT FEEDBACK ────────────────────────────────────────
        public async Task<(bool Success, int DeletedCount, string Error)> DeleteRowsWithoutFeedbackAsync(
            string spreadsheetId, string sheetName)
        {
            try
            {
                var credential = await GetCredentialAsync();

                var service = new SheetsService(new BaseClientService.Initializer
                {
                    HttpClientInitializer = credential,
                    ApplicationName = "RizvizERP Feedback"
                });

                // ── Step 1: Resolve the numeric sheet ID for the named tab ────────
                var spreadsheet = await service.Spreadsheets.Get(spreadsheetId).ExecuteAsync();
                int? sheetId = null;
                foreach (var sheet in spreadsheet.Sheets ?? new List<Google.Apis.Sheets.v4.Data.Sheet>())
                {
                    if (string.Equals(sheet.Properties?.Title, sheetName, StringComparison.OrdinalIgnoreCase))
                    {
                        sheetId = (int?)sheet.Properties.SheetId;
                        break;
                    }
                }

                if (sheetId == null)
                    return (false, 0, $"Sheet tab '{sheetName}' not found in the spreadsheet.");

                // ── Step 2: Read all rows to find which ones have no feedback ─────
                var range = $"{sheetName}!A:T";
                var readResponse = await service.Spreadsheets.Values.Get(spreadsheetId, range).ExecuteAsync();
                var rows = readResponse.Values ?? new List<IList<object>>();

                // Collect 0-based row indices that must be DELETED.
                // Row 0 = header → always keep.
                // Data rows start at index 1.
                // Column S = index 18. If the row has fewer than 19 columns, Column S is empty → delete.
                var rowsToDelete = new List<int>();
                for (int i = 1; i < rows.Count; i++)
                {
                    var row = rows[i];
                    var feedbackText = (row.Count > 18 ? row[18]?.ToString() : null)?.Trim();
                    if (string.IsNullOrEmpty(feedbackText))
                        rowsToDelete.Add(i);
                }

                if (rowsToDelete.Count == 0)
                {
                    _logger.LogInformation("[DeleteRowsWithoutFeedback] Nothing to delete — all rows already have feedback.");
                    return (true, 0, null);
                }

                _logger.LogInformation("[DeleteRowsWithoutFeedback] Will delete {Count} empty rows from '{Sheet}'.",
                    rowsToDelete.Count, sheetName);

                // ── Step 3: Delete from BOTTOM to TOP to prevent index shifting ───
                // Each DeleteDimensionRequest removes exactly one row at a time.
                rowsToDelete.Sort();
                rowsToDelete.Reverse(); // descending

                var requests = rowsToDelete.Select(rowIdx => new Request
                {
                    DeleteDimension = new DeleteDimensionRequest
                    {
                        Range = new DimensionRange
                        {
                            SheetId    = sheetId,
                            Dimension  = "ROWS",
                            StartIndex = rowIdx,      // 0-based, inclusive
                            EndIndex   = rowIdx + 1   // 0-based, exclusive
                        }
                    }
                }).ToList();

                // Google Sheets allows up to 1 000 requests per batchUpdate.
                // Chunk to stay safe.
                const int batchSize = 500;
                for (int offset = 0; offset < requests.Count; offset += batchSize)
                {
                    var batch = requests.Skip(offset).Take(batchSize).ToList();
                    var batchBody = new BatchUpdateSpreadsheetRequest { Requests = batch };
                    await service.Spreadsheets.BatchUpdate(batchBody, spreadsheetId).ExecuteAsync();
                    _logger.LogInformation("[DeleteRowsWithoutFeedback] Deleted batch {From}-{To}.",
                        offset + 1, Math.Min(offset + batchSize, requests.Count));
                }

                _logger.LogInformation("[DeleteRowsWithoutFeedback] ✅ Done. {Count} rows removed.", rowsToDelete.Count);
                return (true, rowsToDelete.Count, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[DeleteRowsWithoutFeedback] Failed: {Error}", ex.Message);
                return (false, 0, ex.Message);
            }
        }

        private string GetExcelFilePath()
        {
            var lastUploadedPath = Path.Combine(Directory.GetCurrentDirectory(), "last_uploaded_excel.xlsx");
            if (File.Exists(lastUploadedPath))
                return lastUploadedPath;

            return null;
        }

        private Interview FindExcelMatch(int? srVal, string candidateName, string companyName, string interviewType, string dateStr)
        {
            try
            {
                var excelFilePath = GetExcelFilePath();
                if (!File.Exists(excelFilePath))
                {
                    _logger.LogWarning("[FindExcelMatch] Excel file not found at: {Path}", excelFilePath);
                    return null;
                }

                var parsed = SeedHelper.ParseInterviewFile(excelFilePath);
                var interviews = parsed.Select(SeedHelper.MapParsedRow)
                                       .Where(x => !string.IsNullOrWhiteSpace(x.IntervieweeName))
                                       .ToList();

                Interview match = null;
                if (srVal.HasValue && srVal.Value > 0)
                {
                    match = interviews.FirstOrDefault(x => x.Sr == srVal.Value);
                }

                if (match == null && !string.IsNullOrWhiteSpace(candidateName))
                {
                    var candidateLower = candidateName.Trim().ToLower();
                    DateTime? parsedDate = null;
                    if (DateTime.TryParse(dateStr, out var pd))
                        parsedDate = pd;

                    match = interviews.FirstOrDefault(x => 
                        (x.IntervieweeName ?? "").Trim().ToLower() == candidateLower &&
                        (!parsedDate.HasValue || x.InterviewDate == parsedDate.Value));

                    if (match == null)
                    {
                        var companyLower = (companyName ?? "").Trim().ToLower();
                        match = interviews.FirstOrDefault(x => 
                            (x.IntervieweeName ?? "").Trim().ToLower() == candidateLower &&
                            (x.CompanyName ?? "").Trim().ToLower() == companyLower);
                    }
                }

                return match;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[FindExcelMatch] Error matching from Excel: {Msg}", ex.Message);
                return null;
            }
        }

        public async Task<(bool Success, string Error)> BackfillMissingSheetDataAsync()
        {
            var spreadsheetId = _config["GoogleSheets:SpreadsheetId"];
            var sheetName = _config["GoogleSheets:SheetName"] ?? "Interview Feedback";

            if (string.IsNullOrWhiteSpace(spreadsheetId))
                return (false, "Google Sheets SpreadsheetId not configured.");

            try
            {
                var credential = await GetCredentialAsync();

                var service = new SheetsService(new BaseClientService.Initializer
                {
                    HttpClientInitializer = credential,
                    ApplicationName = "RizvizERP Feedback"
                });

                await EnsureSheetExistsAsync(service, spreadsheetId, sheetName);

                // Get all rows
                var readRange = $"{sheetName}!A:V";
                var getRequest = service.Spreadsheets.Values.Get(spreadsheetId, readRange);
                var getResponse = await getRequest.ExecuteAsync();
                var sheetRows = getResponse.Values;

                if (sheetRows == null || sheetRows.Count <= 1)
                {
                    _logger.LogInformation("[BackfillMissingSheetData] No rows found to backfill.");
                    return (true, null);
                }

                int backfilledCount = 0;

                // Load Excel data once to avoid repeated parsing inside the loop
                var excelFilePath = GetExcelFilePath();
                List<Interview> interviews = new List<Interview>();
                if (File.Exists(excelFilePath))
                {
                    var parsed = SeedHelper.ParseInterviewFile(excelFilePath);
                    interviews = parsed.Select(SeedHelper.MapParsedRow)
                                       .Where(x => !string.IsNullOrWhiteSpace(x.IntervieweeName))
                                       .ToList();
                }

                for (int i = 1; i < sheetRows.Count; i++)
                {
                    var row = sheetRows[i];
                    if (row == null || row.Count == 0) continue;

                    var srStr = row.Count > 0 ? row[0]?.ToString()?.Trim() : "";
                    var dateStr = row.Count > 1 ? row[1]?.ToString()?.Trim() : "";
                    var interviewee = row.Count > 2 ? row[2]?.ToString()?.Trim() : "";
                    var company = row.Count > 4 ? row[4]?.ToString()?.Trim() : "";

                    if (string.IsNullOrWhiteSpace(interviewee)) continue;

                    // Check if Column G (index 6, Status) or Column H (index 7, Inv To) is empty in Google Sheet
                    var statusInSheet = row.Count > 6 ? row[6]?.ToString()?.Trim() : "";
                    var invToInSheet = row.Count > 7 ? row[7]?.ToString()?.Trim() : "";

                    if (string.IsNullOrEmpty(statusInSheet) || string.IsNullOrEmpty(invToInSheet))
                    {
                        // Match with Excel row
                        int? srVal = null;
                        if (int.TryParse(srStr, out var parsedSr))
                            srVal = parsedSr;

                        Interview match = null;
                        if (srVal.HasValue)
                        {
                            match = interviews.FirstOrDefault(x => x.Sr == srVal.Value);
                        }

                        if (match == null)
                        {
                            var candidateLower = interviewee.Trim().ToLower();
                            DateTime? parsedDate = null;
                            if (DateTime.TryParse(dateStr, out var pd))
                                parsedDate = pd;

                            match = interviews.FirstOrDefault(x => 
                                (x.IntervieweeName ?? "").Trim().ToLower() == candidateLower &&
                                (!parsedDate.HasValue || x.InterviewDate == parsedDate.Value));

                            if (match == null)
                            {
                                var companyLower = (company ?? "").Trim().ToLower();
                                match = interviews.FirstOrDefault(x => 
                                    (x.IntervieweeName ?? "").Trim().ToLower() == candidateLower &&
                                    (x.CompanyName ?? "").Trim().ToLower() == companyLower);
                            }
                        }

                        if (match != null)
                        {
                            // Update A to R for this row
                            int rowNumber = i + 1;
                            var updateRange = $"{sheetName}!A{rowNumber}:R{rowNumber}";

                            var values = new List<IList<object>>
                            {
                                new List<object>
                                {
                                    match.Sr?.ToString() ?? srStr, // A
                                    match.InterviewDate?.ToString("dd-MMM-yyyy") ?? dateStr, // B
                                    match.IntervieweeName ?? interviewee, // C
                                    match.JobHunterName ?? (row.Count > 3 ? row[3]?.ToString() : ""), // D
                                    match.CompanyName ?? company, // E
                                    match.InterviewType ?? (row.Count > 5 ? row[5]?.ToString() : ""), // F
                                    match.Status ?? "", // G
                                    match.InvTo ?? "", // H
                                    match.InterviewFor ?? "", // I
                                    match.JobStartDate?.ToString("dd-MMM-yyyy") ?? "", // J
                                    match.JobCloseDate?.ToString("dd-MMM-yyyy") ?? "", // K
                                    match.FirstSalary ?? "", // L
                                    match.JhSuggest ?? "", // M
                                    match.InterviewCharges != 0 ? match.InterviewCharges.ToString("F2") : "", // N
                                    match.JhDue != 0 ? match.JhDue.ToString("F2") : "", // O
                                    match.FirstPaymentOnJob != 0 ? match.FirstPaymentOnJob.ToString("F2") : "", // P
                                    match.SecondPaymentOnJob != 0 ? match.SecondPaymentOnJob.ToString("F2") : "", // Q
                                    match.BalancePayable != 0 ? match.BalancePayable.ToString("F2") : "" // R
                                }
                            };

                            var updateBody = new ValueRange { Values = values };
                            var updateRequest = service.Spreadsheets.Values.Update(updateBody, spreadsheetId, updateRange);
                            updateRequest.ValueInputOption = SpreadsheetsResource.ValuesResource.UpdateRequest.ValueInputOptionEnum.USERENTERED;
                            await updateRequest.ExecuteAsync();

                            backfilledCount++;
                        }
                    }
                }

                _logger.LogInformation("[BackfillMissingSheetData] ✅ Backfilled {Count} rows with complete Excel details.", backfilledCount);
                return (true, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[BackfillMissingSheetData] Failed: {Error}", ex.Message);
                return (false, ex.Message);
            }
        }
    }
}
