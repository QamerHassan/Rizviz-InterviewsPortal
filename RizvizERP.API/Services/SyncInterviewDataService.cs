using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RizvizERP.API.Configuration;
using RizvizERP.API.Controllers;
using RizvizERP.API.Data;
using RizvizERP.API.DTOs;
using RizvizERP.API.Models;

namespace RizvizERP.API.Services
{
    public class SyncInterviewDataService : ISyncInterviewDataService
    {
        private readonly ApplicationDbContext _context;
        private readonly InterviewSyncSettings _settings;
        private readonly ILogger<SyncInterviewDataService> _logger;
        private readonly NotificationService _notificationService;
        private readonly IGoogleSheetsService _sheetsService;

        // Tracks the last Excel file write-time across auto-sync calls (static = shared across scopes)
        private static DateTime? _lastKnownModifiedTime = null;

        // Caches the details of the most recent synchronization
        private static InterviewSyncResultDto _lastSyncResult = null;

        public SyncInterviewDataService(
            ApplicationDbContext context,
            IOptions<InterviewSyncSettings> settings,
            ILogger<SyncInterviewDataService> logger,
            NotificationService notificationService,
            IGoogleSheetsService sheetsService)
        {
            _context = context;
            _settings = settings.Value;
            _logger = logger;
            _notificationService = notificationService;
            _sheetsService = sheetsService;
        }

        public InterviewSyncResultDto SyncFromExcel(string changedBy = "ExcelSync", bool? replaceAll = null, string uploadFilePath = null)
        {
            var doReplaceAll = replaceAll ?? _settings.ReplaceAllOnRefresh;
            var result = new InterviewSyncResultDto
            {
                SyncedAt = DateTime.UtcNow,
                SourcePath = uploadFilePath ?? _settings.NetworkFilePath
            };

            if (UatSchemaConfiguration.IsEnabled && UatSchemaConfiguration.UseLiveInterviewsView && !UatSchemaConfiguration.UseExcelSyncedInterviews)
            {
                result.Message = "Excel sync requires InterviewSync:UseSyncedDataForApi=true (reads dbo.Rizviz_Interviews, not UAT live view).";
                result.FailedRows = 1;
                result.Errors.Add(result.Message);
                return result;
            }

            var sourcePath = uploadFilePath ?? ResolveSourcePath();
            result.SourcePath = sourcePath;

            if (!File.Exists(sourcePath))
            {
                result.Message = $"Excel file not found: {sourcePath}";
                result.FailedRows = 1;
                result.Errors.Add(result.Message);
                LogSync(result, result.Message);
                return result;
            }

            var currentModifiedTime = File.GetLastWriteTime(sourcePath);
            result.SourceFileLastModified = currentModifiedTime;

            // Efficient early-exit: skip full parse when called by AutoSync and file hasn't changed
            if (string.Equals(changedBy, "AutoSync", StringComparison.OrdinalIgnoreCase)
                && _lastKnownModifiedTime.HasValue
                && _lastKnownModifiedTime.Value == currentModifiedTime
                && string.IsNullOrEmpty(uploadFilePath))
            {
                result.Message = "No file changes detected — skipping sync.";
                result.UnchangedRows = -1; // sentinel so caller knows we skipped
                return result;
            }

            string tempPath = null;
            try
            {
                tempPath = CopyToTemp(sourcePath);
                var parsedRows = SeedHelper.ParseInterviewFile(tempPath);
                result.TotalRows = parsedRows.Count;

                if (doReplaceAll)
                {
                    var allExisting = _context.Interviews.ToList();
                    if (allExisting.Count > 0)
                    {
                        _context.Interviews.RemoveRange(allExisting);
                        _context.SaveChanges();
                    }
                }

                var syncTime = DateTime.UtcNow;
                var insertedCodes = new List<string>();
                var seenSrInExcel = new HashSet<int>();
                var notificationsToSend = new List<(Interview Row, string ChangeType)>();

                var existingRows = doReplaceAll
                    ? new List<Interview>()
                    : _context.Interviews.ToList();

                var byCode = new Dictionary<string, Interview>(StringComparer.OrdinalIgnoreCase);
                var bySr = new Dictionary<int, Interview>();
                foreach (var row in existingRows)
                {
                    row.InterviewCode = InterviewCodeHelper.BuildCode(row);
                    if (!byCode.ContainsKey(row.InterviewCode))
                        byCode[row.InterviewCode] = row;
                    if (row.Sr.HasValue && row.Sr.Value > 0 && !bySr.ContainsKey(row.Sr.Value))
                        bySr[row.Sr.Value] = row;
                }

                foreach (var parsed in parsedRows)
                {
                    try
                    {
                        var incoming = SeedHelper.MapParsedRow(parsed);
                        if (string.IsNullOrWhiteSpace(incoming.IntervieweeName))
                        {
                            result.FailedRows++;
                            continue;
                        }

                        incoming.InterviewCode = InterviewCodeHelper.BuildCode(incoming);
                        incoming.Status = InterviewCodeHelper.NormalizeStatus(incoming.Status, incoming.InterviewType);
                        incoming.LastSyncedAt = syncTime;
                        if (incoming.Sr.HasValue && incoming.Sr.Value > 0)
                            seenSrInExcel.Add(incoming.Sr.Value);

                        var existingRow = FindExistingRow(bySr, byCode, incoming);

                        if (existingRow != null)
                        {
                            var (changed, changeDto) = ApplyChangesIfNeeded(existingRow, incoming, changedBy, syncTime);
                            if (changed)
                            {
                                result.UpdatedRows++;
                                if (result.Changes.Count < 100)
                                    result.Changes.Add(changeDto);
                                notificationsToSend.Add((existingRow, changeDto.ChangeType));
                            }
                            else
                                result.UnchangedRows++;
                        }
                        else
                        {
                            incoming.CreatedAt = syncTime;
                            incoming.UpdatedAt = syncTime;
                            _context.Interviews.Add(incoming);
                            byCode[incoming.InterviewCode] = incoming;
                            if (incoming.Sr.HasValue)
                                bySr[incoming.Sr.Value] = incoming;
                            insertedCodes.Add(incoming.InterviewCode);
                            result.InsertedRows++;
                            if (result.Changes.Count < 100)
                            {
                                result.Changes.Add(new InterviewSyncChangeDto
                                {
                                    Sr = incoming.Sr,
                                    IntervieweeName = incoming.IntervieweeName,
                                    CompanyName = incoming.CompanyName,
                                    ChangeType = InterviewChangeHelper.NewRow,
                                    Summary = "New row from Excel",
                                    NewRow = InterviewChangeHelper.SnapshotRow(incoming),
                                    RowFields = InterviewChangeHelper.BuildRowFields(
                                        new Dictionary<string, string>(),
                                        InterviewChangeHelper.SnapshotRow(incoming),
                                        new List<string>(),
                                        isNewRowOnly: true)
                                });
                            }
                            notificationsToSend.Add((incoming, "NewRow"));
                        }
                    }
                    catch (Exception ex)
                    {
                        result.FailedRows++;
                        if (result.Errors.Count < 20)
                            result.Errors.Add(ex.Message);
                        _logger.LogWarning(ex, "Failed to sync Excel row");
                    }
                }

                _context.SaveChanges();

                // Detect deletes by SR: if SR exists in DB snapshot but not in Excel, remove it.
                var deletedRows = new List<Interview>();
                if (!doReplaceAll)
                {
                    deletedRows = existingRows
                        .Where(r => r.Sr.HasValue && r.Sr.Value > 0 && !seenSrInExcel.Contains(r.Sr.Value))
                        .ToList();

                    if (deletedRows.Count > 0)
                    {
                        _context.Interviews.RemoveRange(deletedRows);
                        _context.SaveChanges();

                        foreach (var row in deletedRows)
                        {
                            if (result.Changes.Count < 100)
                            {
                                var oldRow = InterviewChangeHelper.SnapshotRow(row);
                                result.Changes.Add(new InterviewSyncChangeDto
                                {
                                    Sr = row.Sr,
                                    IntervieweeName = row.IntervieweeName,
                                    CompanyName = row.CompanyName,
                                    ChangeType = "Deleted",
                                    Summary = $"[Deleted] Removed from Excel (SR: {row.Sr})",
                                    OldRow = oldRow,
                                    NewRow = new Dictionary<string, string>(),
                                    RowFields = InterviewChangeHelper.BuildRowFields(oldRow, new Dictionary<string, string>(), new List<string> { $"Deleted row SR: {row.Sr}" })
                                });
                            }
                        }
                    }
                }

                foreach (var code in insertedCodes)
                {
                    if (!byCode.TryGetValue(code, out var row) || row.Id <= 0) continue;
                    _context.InterviewHistory.Add(new InterviewHistory
                    {
                        InterviewId = row.Id,
                        InterviewCode = code,
                        NewStatus = row.Status,
                        NewRecruiter = row.InvTo,
                        NewInterviewDate = row.InterviewDate ?? row.JobStartDate,
                        ChangedBy = changedBy,
                        ChangedAt = syncTime,
                        ChangeSummary = doReplaceAll ? "Loaded from CSV/Excel file" : $"[{InterviewChangeHelper.NewRow}] New interview from Excel"
                    });
                }
                if (insertedCodes.Count > 0)
                    _context.SaveChanges();

                var mode = doReplaceAll ? "replaced all rows from file" : "merged with Excel";
                var deletedCount = deletedRows.Count;
                result.Message = $"Sync complete ({mode}): {result.InsertedRows} new, {result.UpdatedRows} changed, {result.UnchangedRows} unchanged, {deletedCount} deleted, {result.FailedRows} failed.";
                LogSync(result, null);

                // Update timestamp so next AutoSync poll skips if file hasn't changed again
                _lastKnownModifiedTime = currentModifiedTime;

                // Broadcast SignalR notifications for all synced changes to affected users
                foreach (var item in notificationsToSend)
                {
                    try
                    {
                        var row = item.Row;
                        var changeType = item.ChangeType;
                        
                        string dateStr = row.InterviewDate?.ToString("dd MMM yyyy") 
                                         ?? row.JobStartDate?.ToString("dd MMM yyyy") 
                                         ?? DateTime.UtcNow.ToString("dd MMM yyyy");
                                         
                        string messageText = changeType == "NewRow"
                            ? $"Your interview with {row.CompanyName} has been scheduled on {dateStr}."
                            : $"Your interview with {row.CompanyName} has been updated ({changeType}) on {dateStr}.";

                        var notification = new NotificationModel
                        {
                            Id = Guid.NewGuid().ToString(),
                            Message = messageText,
                            Timestamp = DateTime.UtcNow,
                            Type = changeType,
                            TargetInterviewName = row.IntervieweeName,
                            Sr = row.Sr,
                            IntervieweeName = row.IntervieweeName,
                            JobHunterName = row.JobHunterName,
                            CompanyName = row.CompanyName,
                            ChangedField = changeType == "NewRow" ? "New Row" : changeType,
                            OldValue = "",
                            NewValue = row.Status
                        };

                        _notificationService.SendToEligibleConnections(notification, row).GetAwaiter().GetResult();
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to send SignalR notification during excel sync");
                    }
                }

                // Notify affected users + Admins for deleted rows.
                foreach (var row in deletedRows)
                {
                    try
                    {
                        var notification = new NotificationModel
                        {
                            Id = Guid.NewGuid().ToString(),
                            Message = $"Your interview with {row.CompanyName} (SR: {row.Sr}) has been removed.",
                            Timestamp = DateTime.UtcNow,
                            Type = "Deleted",
                            TargetInterviewName = row.IntervieweeName,
                            Sr = row.Sr,
                            IntervieweeName = row.IntervieweeName,
                            JobHunterName = row.JobHunterName,
                            CompanyName = row.CompanyName,
                            ChangedField = "Row Deleted",
                            OldValue = row.Status,
                            NewValue = "Deleted"
                        };
                        _notificationService.SendToEligibleConnections(notification, row).GetAwaiter().GetResult();
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to send delete notification during excel sync");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Interview Excel sync failed");
                result.Message = ex.Message;
                result.FailedRows = Math.Max(1, result.FailedRows);
                result.Errors.Add(ex.Message);
                LogSync(result, ex.Message);
            }
            finally
            {
                if (tempPath != null && File.Exists(tempPath))
                {
                    try { File.Delete(tempPath); } catch { /* ignore */ }
                }
            }

            if (result.InsertedRows > 0)
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _sheetsService.SyncExcelToSheetsAsync();
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to sync newly inserted Excel rows to Google Sheets in background task.");
                    }
                });
            }

            _lastSyncResult = result;
            return result;
        }

        public InterviewSyncResultDto GetLastSyncResult()
        {
            return _lastSyncResult ?? new InterviewSyncResultDto
            {
                Message = "No synchronization has occurred since server startup.",
                SyncedAt = DateTime.UtcNow
            };
        }

        public InterviewSyncStatusDto GetSyncStatus()
        {
            InterviewSyncLog last = null;
            try
            {
                last = _context.InterviewSyncLogs
                    .OrderByDescending(x => x.SyncedAt)
                    .FirstOrDefault();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not read interview sync log");
            }

            var sourcePath = last?.SourcePath;
            DateTime? fileModified = null;
            if (!string.IsNullOrWhiteSpace(sourcePath) && File.Exists(sourcePath))
                fileModified = File.GetLastWriteTime(sourcePath);
            else
            {
                var resolved = ResolveSourcePath();
                if (File.Exists(resolved))
                {
                    sourcePath = resolved;
                    fileModified = File.GetLastWriteTime(resolved);
                }
            }

            return new InterviewSyncStatusDto
            {
                LastSyncedAt = last?.SyncedAt,
                SourcePath = sourcePath,
                SourceFileLastModified = fileModified,
                TotalRows = last?.TotalRows ?? 0,
                InsertedRows = last?.InsertedRows ?? 0,
                UpdatedRows = last?.UpdatedRows ?? 0,
                AutoSyncEnabled = _settings.Enabled && _settings.SyncIntervalMinutes > 0,
                SyncIntervalMinutes = _settings.SyncIntervalMinutes
            };
        }

        public List<InterviewHistoryDto> GetInterviewHistory(int interviewId)
        {
            return _context.InterviewHistory
                .Where(h => h.InterviewId == interviewId)
                .OrderByDescending(h => h.ChangedAt)
                .Select(h => new InterviewHistoryDto
                {
                    Id = h.Id,
                    InterviewId = h.InterviewId,
                    InterviewCode = h.InterviewCode,
                    OldStatus = h.OldStatus,
                    NewStatus = h.NewStatus,
                    OldRecruiter = h.OldRecruiter,
                    NewRecruiter = h.NewRecruiter,
                    OldInterviewDate = h.OldInterviewDate,
                    NewInterviewDate = h.NewInterviewDate,
                    ChangedBy = h.ChangedBy,
                    ChangedAt = h.ChangedAt,
                    ChangeSummary = h.ChangeSummary
                })
                .ToList();
        }

        private static string GetRepoRoot() =>
            Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), ".."));

        private string ResolveSourcePath()
        {
            var repoRoot = GetRepoRoot();

            if (!string.IsNullOrWhiteSpace(_settings.PreferredLocalFile))
            {
                var preferred = ResolvePreferredPath(_settings.PreferredLocalFile.Trim(), repoRoot);
                if (File.Exists(preferred))
                    return preferred;
            }

            foreach (var name in new[]
                     {
                         "Interview Software.xlsx",
                         "interviews.xlsx",
                         "interviews.csv",
                         "interviews_seed.xlsx",
                         "interviews_seed.csv"
                     })
            {
                var path = Path.Combine(repoRoot, name);
                if (File.Exists(path))
                    return path;
            }

            var configured = _settings.NetworkFilePath?.Trim();
            if (!string.IsNullOrEmpty(configured) && File.Exists(configured))
                return configured;

            return Path.Combine(repoRoot, _settings.PreferredLocalFile ?? "Interview Software.xlsx");
        }

        private static string ResolvePreferredPath(string configured, string repoRoot) =>
            Path.IsPathRooted(configured)
                ? Path.GetFullPath(configured)
                : Path.Combine(repoRoot, configured);

        private static string CopyToTemp(string sourcePath)
        {
            var ext = Path.GetExtension(sourcePath);
            if (string.IsNullOrEmpty(ext)) ext = ".xlsx";
            var tempPath = Path.Combine(Path.GetTempPath(), $"rizviz-interviews-{Guid.NewGuid():N}{ext}");
            using (var src = new FileStream(sourcePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
            using (var dst = new FileStream(tempPath, FileMode.Create, FileAccess.Write, FileShare.None))
                src.CopyTo(dst);
            return tempPath;
        }

        private static Interview FindExistingRow(
            Dictionary<int, Interview> bySr,
            Dictionary<string, Interview> byCode,
            Interview incoming)
        {
            if (incoming.Sr.HasValue && incoming.Sr.Value > 0 &&
                bySr.TryGetValue(incoming.Sr.Value, out var bySrRow))
                return bySrRow;
            if (byCode.TryGetValue(incoming.InterviewCode, out var byCodeRow))
                return byCodeRow;
            return null;
        }

        private (bool Changed, InterviewSyncChangeDto ChangeDto) ApplyChangesIfNeeded(
            Interview existing, Interview incoming, string changedBy, DateTime syncTime)
        {
            var fieldChanges = InterviewChangeHelper.CompareFields(existing, incoming);
            if (fieldChanges.Count == 0)
            {
                existing.LastSyncedAt = syncTime;
                existing.RawRowJson = incoming.RawRowJson ?? existing.RawRowJson;
                return (false, null);
            }

            var oldRowSnapshot = InterviewChangeHelper.SnapshotRow(existing);
            var newRowSnapshot = InterviewChangeHelper.SnapshotRow(incoming);

            var oldStatus = existing.Status ?? "Scheduled";
            var newStatus = incoming.Status ?? "Scheduled";
            var changeType = InterviewChangeHelper.DetectChangeType(existing, incoming, fieldChanges);
            var historySummary = InterviewChangeHelper.BuildHistorySummary(changeType, fieldChanges);

            _context.InterviewHistory.Add(new InterviewHistory
            {
                InterviewId = existing.Id,
                InterviewCode = existing.InterviewCode ?? incoming.InterviewCode,
                OldStatus = oldStatus,
                NewStatus = newStatus,
                OldRecruiter = existing.InvTo,
                NewRecruiter = incoming.InvTo,
                OldInterviewDate = existing.InterviewDate ?? existing.JobStartDate,
                NewInterviewDate = incoming.InterviewDate ?? incoming.JobStartDate,
                ChangedBy = changedBy,
                ChangedAt = syncTime,
                ChangeSummary = historySummary
            });

            existing.InvTo = incoming.InvTo;
            existing.Sr = incoming.Sr;
            existing.JobHunterName = incoming.JobHunterName;
            existing.InterviewFor = incoming.InterviewFor;
            existing.IntervieweeName = incoming.IntervieweeName;
            existing.CompanyName = incoming.CompanyName;
            existing.JobStartDate = incoming.JobStartDate;
            existing.JobCloseDate = incoming.JobCloseDate;
            existing.InterviewDate = incoming.InterviewDate ?? incoming.JobStartDate;
            existing.InterviewType = incoming.InterviewType;
            existing.Status = newStatus;
            existing.FirstSalary = incoming.FirstSalary;
            existing.JhSuggest = incoming.JhSuggest;
            existing.InterviewCharges = incoming.InterviewCharges;
            existing.JhDue = incoming.JhDue;
            existing.FirstPaymentOnJob = incoming.FirstPaymentOnJob;
            existing.SecondPaymentOnJob = incoming.SecondPaymentOnJob;
            existing.BalancePayable = incoming.BalancePayable;
            existing.InterviewCode = InterviewCodeHelper.BuildCode(incoming);
            existing.RawRowJson = incoming.RawRowJson ?? existing.RawRowJson;
            existing.LastSyncedAt = syncTime;
            existing.UpdatedAt = syncTime;

            var dto = new InterviewSyncChangeDto
            {
                Sr = incoming.Sr,
                IntervieweeName = incoming.IntervieweeName,
                CompanyName = incoming.CompanyName,
                ChangeType = changeType,
                Summary = historySummary,
                FieldChanges = fieldChanges,
                OldRow = oldRowSnapshot,
                NewRow = newRowSnapshot,
                RowFields = InterviewChangeHelper.BuildRowFields(oldRowSnapshot, newRowSnapshot, fieldChanges)
            };
            return (true, dto);
        }

        private void LogSync(InterviewSyncResultDto result, string errorMessage)
        {
            try
            {
                _context.InterviewSyncLogs.Add(new InterviewSyncLog
                {
                    SyncedAt = result.SyncedAt,
                    SourcePath = result.SourcePath,
                    TotalRows = result.TotalRows,
                    InsertedRows = result.InsertedRows,
                    UpdatedRows = result.UpdatedRows,
                    UnchangedRows = result.UnchangedRows,
                    FailedRows = result.FailedRows,
                    ErrorMessage = errorMessage
                });
                _context.SaveChanges();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not write interview sync log");
            }
        }
    }
}
