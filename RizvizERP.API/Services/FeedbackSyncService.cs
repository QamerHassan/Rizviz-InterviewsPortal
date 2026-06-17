using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RizvizERP.API.Data;
using RizvizERP.API.Models;

namespace RizvizERP.API.Services
{
    /// <summary>
    /// Runs on every backend startup.
    /// Reads Sheet1 (AI Feedback) and restores any missing records into the DB.
    /// Then syncs Excel interview data → Google Sheets master sheet.
    ///
    /// Sheet1 column order (A–J):
    ///   A=Id(0)  B=Interviewee(1)  C=Interviewer(2)  D=Company(3)  E=InterviewType(4)
    ///   F=InterviewDate(5)  G=Recommendation(6)  H=AI Feedback(7)  I=FeedbackDate(8)  J=Timestamp(9)
    /// </summary>
    public class FeedbackSyncService : IHostedService
    {
        private readonly IServiceProvider _services;
        private readonly IGoogleSheetsService _sheetsService;
        private readonly ILogger<FeedbackSyncService> _logger;

        private const string SpreadsheetId = "1ucpwjWi8KaKDLjUx5QnoUUssXk9HhYPvfxzAfPj4jL0";
        private const string SheetName     = "Interview Feedback";

        public FeedbackSyncService(
            IServiceProvider services,
            IGoogleSheetsService sheetsService,
            ILogger<FeedbackSyncService> logger)
        {
            _services      = services;
            _sheetsService = sheetsService;
            _logger        = logger;
        }

        public async Task StartAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("[FeedbackSync] ====== Startup sync starting ======");

            // ── Step 1: Restore feedback records from Google Sheet → DB ──────────
            try
            {
                using var scope   = _services.CreateScope();
                var dbContext     = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

                var rows = await _sheetsService.ReadAllRowsAsync(SpreadsheetId, SheetName);
                _logger.LogInformation("[FeedbackSync] Sheet sync started. Total rows from 'Interview Feedback' tab: {Count}", rows?.Count ?? 0);

                int restored = 0;
                int skipped  = 0;

                if (rows != null && rows.Count > 1)
                {
                    // Always start from row index 1 — row 0 is the header
                    // Track Srs queued in THIS batch (not yet committed) to prevent in-batch duplicates
                    var queuedSrs = new HashSet<int>();
                    var queuedKeys = new HashSet<string>(); // fallback for rows without Sr

                    for (int i = 1; i < rows.Count; i++)
                    {
                        var row = rows[i];
                        if (row == null || row.Count < 3) { skipped++; continue; }

                        // Skip any row whose col0 looks like a header
                        var col0 = row[0]?.ToString()?.Trim() ?? "";
                        if (col0.Equals("Sr", StringComparison.OrdinalIgnoreCase) ||
                            col0.Equals("Sr.", StringComparison.OrdinalIgnoreCase))
                        { skipped++; continue; }

                        // Column mapping — "Interview Feedback" tab:
                        // A=Sr(0)  B=Date(1)  C=Interviewee(2)  D=JobHunter(3)  E=Company(4)
                        // F=InterviewType(5)  G=Status(6) ... S=Feedback(18) T=Recommendation(19)
                        var intervieweeName = row.Count > 2 ? row[2]?.ToString()?.Trim() : "";
                        var jobHunterName   = row.Count > 3 ? row[3]?.ToString()?.Trim() : "";
                        var companyName     = row.Count > 4 ? row[4]?.ToString()?.Trim() : "";
                        var interviewType   = row.Count > 5 ? row[5]?.ToString()?.Trim() : "";
                        var statusStr       = row.Count > 6 ? row[6]?.ToString()?.Trim() : "";
                        var dateStr         = row.Count > 1 ? row[1]?.ToString()?.Trim() : "";
                        var englishFeedback = row.Count > 18 ? row[18]?.ToString()?.Trim() : "";
                        var recommendation  = row.Count > 19 ? row[19]?.ToString()?.Trim() : "";

                        if (string.IsNullOrWhiteSpace(intervieweeName)) { skipped++; continue; }
                        if (string.IsNullOrEmpty(englishFeedback)) { skipped++; continue; } // Skip rows without feedback

                        _logger.LogInformation(
                            "[FeedbackSync] Row {i}: Interviewee='{Name}', Company='{Co}', Type='{Type}', Date='{Date}' has feedback. Restoring...",
                            i, intervieweeName, companyName, interviewType, dateStr);

                        DateTime? interviewDate = null;
                        if (!string.IsNullOrWhiteSpace(dateStr) &&
                            DateTime.TryParse(dateStr, out var parsedDate))
                            interviewDate = parsedDate;

                        // Deduplicate by Sr number (unique per interview).
                        // Check both DB (committed) and queuedSrs (pending in this batch).
                        var srStr2 = row.Count > 0 ? row[0]?.ToString()?.Trim() : "";
                        bool exists;
                        if (int.TryParse(srStr2, out var srNum) && srNum > 0)
                        {
                            // In-batch duplicate guard
                            if (queuedSrs.Contains(srNum))
                            {
                                _logger.LogInformation(
                                    "[FeedbackSync] ⏭ Skipping in-batch duplicate Sr={Sr} ({Name}/{Co})",
                                    srNum, intervieweeName, companyName);
                                skipped++;
                                continue;
                            }
                            exists = await dbContext.InterviewFeedbacks.AnyAsync(f =>
                                f.Sr == srNum, cancellationToken);
                        }
                        else
                        {
                            // Fallback: name + company + date
                            var fallbackKey = $"{intervieweeName?.ToLower()}|{companyName?.ToLower()}|{dateStr?.ToLower()}";
                            if (queuedKeys.Contains(fallbackKey))
                            {
                                _logger.LogInformation(
                                    "[FeedbackSync] ⏭ Skipping in-batch duplicate (name+co+date) for {Name}/{Co}",
                                    intervieweeName, companyName);
                                skipped++;
                                continue;
                            }
                            DateTime? matchDate = DateTime.TryParse(dateStr, out var fbd) ? fbd : (DateTime?)null;
                            exists = await dbContext.InterviewFeedbacks.AnyAsync(f =>
                                f.IntervieweeName.ToLower() == intervieweeName.ToLower() &&
                                (f.CompanyName   ?? "").ToLower() == (companyName   ?? "").ToLower() &&
                                f.InterviewDate == matchDate,
                                cancellationToken);
                        }

                        if (!exists)
                        {
                            dbContext.InterviewFeedbacks.Add(new InterviewFeedback
                            {
                                Sr              = int.TryParse(srStr2, out var srVal2) ? srVal2 : (int?)null,
                                IntervieweeName = intervieweeName,
                                InterviewerName = jobHunterName,
                                CompanyName     = companyName,
                                InterviewType   = interviewType,
                                InterviewDate   = DateTime.TryParse(dateStr, out var pd) ? pd : (DateTime?)null,
                                Recommendation  = !string.IsNullOrEmpty(recommendation) ? recommendation : statusStr,
                                EnglishFeedback = englishFeedback,
                                FeedbackBy      = jobHunterName,
                                CreatedAt       = DateTime.UtcNow
                            });
                            // Mark as queued so duplicates later in the same sheet are blocked
                            if (int.TryParse(srStr2, out var qSr) && qSr > 0)
                                queuedSrs.Add(qSr);
                            else
                                queuedKeys.Add($"{intervieweeName?.ToLower()}|{companyName?.ToLower()}|{dateStr?.ToLower()}");

                            restored++;
                            _logger.LogInformation(
                                "[FeedbackSync] ✅ Queued restore: {Name} / {Company} / {Type} (Sr={Sr})",
                                intervieweeName, companyName, interviewType, srStr2);
                        }
                        else
                        {
                            _logger.LogInformation(
                                "[FeedbackSync] ⏭ Already in DB: {Name} / {Company} / {Type} (Sr={Sr})",
                                intervieweeName, companyName, interviewType, srStr2);
                            skipped++;
                        }
                    }

                    if (restored > 0)
                    {
                        await dbContext.SaveChangesAsync(cancellationToken);
                        _logger.LogInformation(
                            "[FeedbackSync] ✅ Restored {Count} feedback record(s) from Google Sheet into DB.",
                            restored);
                    }
                    else
                    {
                        _logger.LogInformation("[FeedbackSync] All 'Interview Feedback' records already exist in DB (restored=0, skipped={Skipped}).", skipped);
                    }
                }
                else
                {
                    _logger.LogWarning("[FeedbackSync] 'Interview Feedback' tab has no data rows (total rows={Count}). Nothing to restore.", rows?.Count ?? 0);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[FeedbackSync] ❌ Failed during Sheet → DB restore.");
            }

            // ── Step 1b: Backfill missing columns in Google Sheets from Excel ────
            try
            {
                var (backfillOk, backfillErr) = await _sheetsService.BackfillMissingSheetDataAsync();
                if (backfillOk)
                    _logger.LogInformation("[FeedbackSync] ✅ Google Sheets backfill completed successfully.");
                else
                    _logger.LogWarning("[FeedbackSync] ⚠ Google Sheets backfill failed: {Error}", backfillErr);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[FeedbackSync] Google Sheets backfill failed during startup. Continuing.");
            }

            // ── Step 2: Sync Excel → Google Sheets master sheet (non-fatal) ─────
            try
            {
                var (success, error) = await _sheetsService.SyncExcelToSheetsAsync();
                if (success)
                    _logger.LogInformation("[FeedbackSync] ✅ Excel → Google Sheets sync completed.");
                else
                    _logger.LogWarning("[FeedbackSync] ⚠ Excel → Google Sheets sync failed: {Error}", error);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[FeedbackSync] Excel → Sheets sync failed during startup. Continuing.");
            }

            _logger.LogInformation("[FeedbackSync] ====== Startup sync complete ======");
        }

        public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
