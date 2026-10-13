using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Collections.Generic;
using ClosedXML.Excel;
using Microsoft.Extensions.Logging;
using RizvizERP.API.Controllers;
using Microsoft.Extensions.DependencyInjection;

namespace RizvizERP.API.Services
{
    public class ArchiveService
    {
        private readonly FileKeyService _fileKeyService;
        private readonly ILogger<ArchiveService> _logger;
        private readonly IServiceScopeFactory _scopeFactory;

        private static readonly object _archiveLock = new object();
        private static DateTime? _lastArchivedDate = null;

        public ArchiveService(
            FileKeyService fileKeyService,
            ILogger<ArchiveService> logger,
            IServiceScopeFactory scopeFactory)
        {
            _fileKeyService = fileKeyService;
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        /// <summary>
        /// Called by the daily background timer — skips if already ran today.
        /// </summary>
        public void ArchivePastInterviewsDaily()
        {
            var today = DateTime.Today;
            if (_lastArchivedDate.HasValue && _lastArchivedDate.Value == today)
            {
                _logger.LogInformation("[ArchiveService] Archive already ran today ({Today}). Skipping.", today.ToString("yyyy-MM-dd"));
                return;
            }

            _logger.LogInformation("[ArchiveService] Running scheduled daily archive check.");
            ArchivePastInterviews();
        }

        /// <summary>
        /// Core archive logic. Resets the daily gate so it always runs when called directly.
        /// </summary>
        public void ArchivePastInterviews()
        {
            // Reset daily gate so this method always executes fully when called directly
            // (e.g. from the /api/archive/trigger endpoint or on startup).
            _lastArchivedDate = null;

            lock (_archiveLock)
            {
                FileStream liveFileStream = null;
                XLWorkbook liveWb = null;
                try
                {
                    string liveFilePath = Path.Combine(Directory.GetCurrentDirectory(), "last_uploaded_excel.xlsx");
                    if (!File.Exists(liveFilePath))
                    {
                        _logger.LogInformation("[ArchiveService] Live Excel file 'last_uploaded_excel.xlsx' not found. Nothing to archive.");
                        return;
                    }

                    _logger.LogInformation("[ArchiveService] Opening '{FilePath}' for archiving.", liveFilePath);

                    // Open with FileShare.ReadWrite so we don't conflict with ExcelFileWatcherService
                    // which may already hold the file open for baseline tracking.
                    liveFileStream = new FileStream(liveFilePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                    liveWb = new XLWorkbook(liveFileStream);

                    // ── Always use the FIRST worksheet (live file has one sheet: "Sheet1") ──
                    var ws = liveWb.Worksheets.First();
                    _logger.LogInformation("[ArchiveService] Using sheet: '{SheetName}'", ws.Name);

                    // ── Scan for the actual header row index ─────────────────────────────
                    int headerRowIndex = 1;
                    int lastRow = ws.LastRowUsed()?.RowNumber() ?? 1;
                    int lastCol = ws.LastColumnUsed()?.ColumnNumber() ?? 30;

                    for (int r = 1; r <= Math.Min(lastRow, 20); r++)
                    {
                        var rowCells = new List<string>();
                        for (int col = 1; col <= lastCol; col++)
                        {
                            rowCells.Add(ws.Cell(r, col).GetString()?.Trim() ?? "");
                        }

                        if (SeedHelper.IsInterviewHeaderRow(rowCells))
                        {
                            headerRowIndex = r;
                            _logger.LogInformation("[ArchiveService] Detected header row at index {Index}", headerRowIndex);
                            break;
                        }
                    }

                    // ── Read ALL headers from the detected header row by column index ─────
                    var headerColsMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                    var liveHeadersList = new List<string>(); // ordered, for archive header copy

                    for (int col = 1; col <= lastCol; col++)
                    {
                        var raw = ws.Cell(headerRowIndex, col).GetString()?.Trim() ?? "";
                        _logger.LogInformation("[ArchiveService] Header col {Col}: '{Header}'", col, raw);
                        if (!string.IsNullOrWhiteSpace(raw))
                        {
                            headerColsMap[raw] = col;
                            liveHeadersList.Add(raw);
                        }
                    }

                    // ── Locate "Interview DateTime" column (exact name from file) ─────────
                    // Try exact name first, then fall back to any alias in AliasMap.
                    int interviewDateTimeCol = -1;

                    // 1. Exact match (what the live file actually has)
                    if (headerColsMap.TryGetValue("Interview DateTime", out int exactCol))
                    {
                        interviewDateTimeCol = exactCol;
                        _logger.LogInformation("[ArchiveService] Found 'Interview DateTime' (exact match) at column {Col}.", interviewDateTimeCol);
                    }
                    else
                    {
                        // 2. Alias fallback via AliasMap
                        var interviewDateTimeAliases = SeedHelper.AliasMap["InterviewDateTime"];
                        foreach (var alias in interviewDateTimeAliases)
                        {
                            var aliasNorm = SeedHelper.NormalizeHeaderForMatching(alias);
                            foreach (var kvp in headerColsMap)
                            {
                                if (SeedHelper.NormalizeHeaderForMatching(kvp.Key) == aliasNorm)
                                {
                                    interviewDateTimeCol = kvp.Value;
                                    _logger.LogInformation("[ArchiveService] Found 'Interview DateTime' via alias '{Alias}' at column {Col}.", kvp.Key, interviewDateTimeCol);
                                    break;
                                }
                            }
                            if (interviewDateTimeCol != -1) break;
                        }
                    }

                    if (interviewDateTimeCol == -1)
                    {
                        _logger.LogWarning(
                            "[ArchiveService] 'Interview DateTime' column NOT found. All {Count} headers found: [{Headers}]. " +
                            "Archiving cannot proceed.",
                            headerColsMap.Count,
                            string.Join(", ", headerColsMap.Keys));
                        return;
                    }

                    // ── Find "Creation_Date" column (preserved but not used for decisions) ─
                    int creationDateCol = -1;
                    var creationDateAliases = SeedHelper.AliasMap["CreationDate"];
                    if (headerColsMap.TryGetValue("Creation_Date", out int cdExact))
                    {
                        creationDateCol = cdExact;
                    }
                    else
                    {
                        foreach (var alias in creationDateAliases)
                        {
                            var aliasNorm = SeedHelper.NormalizeHeaderForMatching(alias);
                            foreach (var kvp in headerColsMap)
                            {
                                if (SeedHelper.NormalizeHeaderForMatching(kvp.Key) == aliasNorm)
                                {
                                    creationDateCol = kvp.Value;
                                    break;
                                }
                            }
                            if (creationDateCol != -1) break;
                        }
                    }

                    // ── Find "JobStartDate" and "JobCloseDate" columns ──────────────────────
                    // Used to protect future-scheduled rows that have no Interview DateTime.
                    int jobStartDateCol = -1;
                    int jobCloseDateCol = -1;
                    var jobStartAliases = SeedHelper.AliasMap["JobStartDate"];
                    var jobCloseAliases = SeedHelper.AliasMap["JobCloseDate"];

                    foreach (var alias in jobStartAliases)
                    {
                        var aliasNorm = SeedHelper.NormalizeHeaderForMatching(alias);
                        foreach (var kvp in headerColsMap)
                        {
                            if (SeedHelper.NormalizeHeaderForMatching(kvp.Key) == aliasNorm)
                            {
                                jobStartDateCol = kvp.Value;
                                break;
                            }
                        }
                        if (jobStartDateCol != -1) break;
                    }

                    foreach (var alias in jobCloseAliases)
                    {
                        var aliasNorm = SeedHelper.NormalizeHeaderForMatching(alias);
                        foreach (var kvp in headerColsMap)
                        {
                            if (SeedHelper.NormalizeHeaderForMatching(kvp.Key) == aliasNorm)
                            {
                                jobCloseDateCol = kvp.Value;
                                break;
                            }
                        }
                        if (jobCloseDateCol != -1) break;
                    }

                    _logger.LogInformation(
                        "[ArchiveService] Column indices — 'Interview DateTime': {IDTCol}, 'Creation_Date': {CDCol}, 'Job Start Date': {JSCol}, 'Job Close Date': {JCCol}.",
                        interviewDateTimeCol,
                        creationDateCol > 0 ? creationDateCol.ToString() : "(not found)",
                        jobStartDateCol > 0 ? jobStartDateCol.ToString() : "(not found)",
                        jobCloseDateCol > 0 ? jobCloseDateCol.ToString() : "(not found)");

                    // ── Determine data row range ────────────────────────────────────────
                    _logger.LogInformation("[ArchiveService] Sheet has {LastRow} rows (header = row {HeaderRow}, data rows {StartRow}–{LastRow}).", lastRow, headerRowIndex, headerRowIndex + 1, lastRow);

                    if (lastRow < headerRowIndex + 1)
                    {
                        _logger.LogInformation("[ArchiveService] No data rows found. Nothing to archive.");
                        return;
                    }

                    // ── Scan every data row ─────────────────────────────────────────────
                    var today = DateTime.Today;
                    int totalDataRows = 0;
                    int archivedNoDate = 0;
                    int skippedFutureOrToday = 0;
                    int keptActiveFallback = 0;

                    var rowsToArchiveByYear = new Dictionary<int, List<int>>(); // year → list of row numbers
                    var rowsToDeleteFromLive = new List<int>();

                    for (int rowNum = headerRowIndex + 1; rowNum <= lastRow; rowNum++)
                    {
                        // Skip completely empty rows
                        var firstCell = ws.Cell(rowNum, 1).GetString()?.Trim();
                        var dateCell  = ws.Cell(rowNum, interviewDateTimeCol).GetString()?.Trim();
                        if (string.IsNullOrWhiteSpace(firstCell) && string.IsNullOrWhiteSpace(dateCell))
                            continue;

                        totalDataRows++;

                        var interviewDateStr = ws.Cell(rowNum, interviewDateTimeCol).GetString()?.Trim();

                        if (!DateTime.TryParse(interviewDateStr, out var interviewDateTime))
                        {
                            // ── No parseable Interview DateTime ─────────────────────────────
                            // Before archiving, check JobStartDate and JobCloseDate.
                            // If either is today or in the future, this is an active/upcoming
                            // interview — keep it in the live file.
                            bool hasFutureActivity = false;

                            if (jobStartDateCol > 0)
                            {
                                var jobStartStr = ws.Cell(rowNum, jobStartDateCol).GetString()?.Trim();
                                if (DateTime.TryParse(jobStartStr, out var jobStartDt) && jobStartDt.Date >= today)
                                    hasFutureActivity = true;
                            }

                            if (!hasFutureActivity && jobCloseDateCol > 0)
                            {
                                var jobCloseStr = ws.Cell(rowNum, jobCloseDateCol).GetString()?.Trim();
                                if (DateTime.TryParse(jobCloseStr, out var jobCloseDt) && jobCloseDt.Date >= today)
                                    hasFutureActivity = true;
                            }

                            if (hasFutureActivity)
                            {
                                _logger.LogInformation(
                                    "[ArchiveService] Row {Row}: Interview DateTime blank/unparseable but has future Job Start/Close date — keeping as active.",
                                    rowNum);
                                keptActiveFallback++;
                                skippedFutureOrToday++;
                                continue;
                            }

                            // Truly dateless row — archive as historical to prevent accumulation.
                            _logger.LogInformation(
                                "[ArchiveService] Row {Row}: Interview DateTime '{Val}' unparseable, no future Job dates — archiving as historical.",
                                rowNum, interviewDateStr);
                            int noDateYear = today.Year;
                            if (!rowsToArchiveByYear.ContainsKey(noDateYear))
                                rowsToArchiveByYear[noDateYear] = new List<int>();
                            rowsToArchiveByYear[noDateYear].Add(rowNum);
                            rowsToDeleteFromLive.Add(rowNum);
                            archivedNoDate++;
                            continue;
                        }

                        if (interviewDateTime.Date < today)
                        {
                            int year = interviewDateTime.Year;
                            if (!rowsToArchiveByYear.ContainsKey(year))
                                rowsToArchiveByYear[year] = new List<int>();
                            rowsToArchiveByYear[year].Add(rowNum);
                            rowsToDeleteFromLive.Add(rowNum);
                        }
                        else
                        {
                            skippedFutureOrToday++;
                        }
                    }

                    int candidateCount = rowsToDeleteFromLive.Count;

                    _logger.LogInformation(
                        "[ArchiveService] Scan complete — total data rows: {Total}, " +
                        "past (Interview DateTime < {Today}): {Past}, " +
                        "today/future (kept): {Future}, " +
                        "no-date archived as historical: {NoDate}, " +
                        "no-date kept (has future Job date): {KeptActive}.",
                        totalDataRows, today.ToString("yyyy-MM-dd"),
                        candidateCount - archivedNoDate, skippedFutureOrToday - keptActiveFallback,
                        archivedNoDate, keptActiveFallback);

                    if (candidateCount == 0)
                    {
                        _logger.LogInformation("[ArchiveService] No past rows found — nothing to archive.");
                        _lastArchivedDate = today;
                        return;
                    }

                    // ── Archives directory ───────────────────────────────────────────────
                    string archivesDirPath = Path.Combine(Directory.GetCurrentDirectory(), "Archives");
                    if (!Directory.Exists(archivesDirPath))
                    {
                        Directory.CreateDirectory(archivesDirPath);
                        _logger.LogInformation("[ArchiveService] Created Archives directory: '{Path}'.", archivesDirPath);
                    }

                    // ── Write rows into Archive_{YEAR}.xlsx files ────────────────────────
                    int totalArchived = 0;

                    foreach (var kvp in rowsToArchiveByYear)
                    {
                        int year = kvp.Key;
                        var pastRowNums = kvp.Value;
                        string archiveFilePath = Path.Combine(archivesDirPath, $"Archive_{year}.xlsx");

                        _logger.LogInformation("[ArchiveService] Writing {Count} rows for year {Year} → '{FilePath}'...",
                            pastRowNums.Count, year, archiveFilePath);

                        using var archiveWb = File.Exists(archiveFilePath) ? new XLWorkbook(archiveFilePath) : new XLWorkbook();
                        var archiveWs = archiveWb.Worksheets.FirstOrDefault(w =>
                            w.Name.Equals("ArchivedInterviews", StringComparison.OrdinalIgnoreCase))
                            ?? archiveWb.Worksheets.Add("ArchivedInterviews");

                        // Read or write archive headers
                        var archiveHeadersMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                        int archiveHeaderRowIndex = 1;
                        int archiveLastCol = archiveWs.LastColumnUsed()?.ColumnNumber() ?? 0;
                        int archiveLastRow = archiveWs.LastRowUsed()?.RowNumber() ?? 0;

                        if (archiveLastRow == 0)
                        {
                            // Empty archive sheet — write headers from live sheet
                            for (int i = 0; i < liveHeadersList.Count; i++)
                            {
                                var h = liveHeadersList[i];
                                archiveWs.Cell(archiveHeaderRowIndex, i + 1).Value = h;
                                archiveHeadersMap[h] = i + 1;
                            }
                            int fkIdx = liveHeadersList.Count + 1;
                            archiveWs.Cell(archiveHeaderRowIndex, fkIdx).Value = "File Key";
                            archiveHeadersMap["File Key"] = fkIdx;
                            archiveWs.Row(archiveHeaderRowIndex).Style.Font.Bold = true;
                        }
                        else
                        {
                            // Archive already has rows — map its existing headers
                            for (int col = 1; col <= archiveLastCol; col++)
                            {
                                var h = archiveWs.Cell(archiveHeaderRowIndex, col).GetString()?.Trim() ?? "";
                                if (!string.IsNullOrWhiteSpace(h))
                                    archiveHeadersMap[h] = col;
                            }
                            if (!archiveHeadersMap.ContainsKey("File Key"))
                            {
                                int fkIdx = archiveLastCol + 1;
                                archiveWs.Cell(archiveHeaderRowIndex, fkIdx).Value = "File Key";
                                archiveHeadersMap["File Key"] = fkIdx;
                                archiveWs.Cell(archiveHeaderRowIndex, fkIdx).Style.Font.Bold = true;
                            }
                        }

                        int nextArchiveRow = archiveWs.LastRowUsed()?.RowNumber() + 1 ?? 2;

                        foreach (int sourceRowNum in pastRowNums)
                        {
                            // Copy every header-mapped live column to the archive
                            foreach (var hKvp in headerColsMap)
                            {
                                if (archiveHeadersMap.TryGetValue(hKvp.Key, out int archCol))
                                    archiveWs.Cell(nextArchiveRow, archCol).Value = ws.Cell(sourceRowNum, hKvp.Value).Value;
                            }

                            // Compute File Key from Interview DateTime
                            var idtStr = ws.Cell(sourceRowNum, interviewDateTimeCol).GetString()?.Trim();
                            string fileKey = "";
                            if (DateTime.TryParse(idtStr, out var idtVal))
                            {
                                try   { fileKey = _fileKeyService.GenerateFileKey(idtVal); }
                                catch { fileKey = $"{idtVal.Year}_M{idtVal.Month:D2}_WKND"; }
                            }

                            if (archiveHeadersMap.TryGetValue("File Key", out int fkCol))
                                archiveWs.Cell(nextArchiveRow, fkCol).Value = fileKey;

                            nextArchiveRow++;
                            totalArchived++;
                        }

                        archiveWb.SaveAs(archiveFilePath);
                        _logger.LogInformation("[ArchiveService] Saved '{FilePath}' ({Count} new rows).", archiveFilePath, pastRowNums.Count);
                    }

                    // ── Delete archived rows from live Excel (reverse order!) ────────────
                    _logger.LogInformation("[ArchiveService] Deleting {Count} archived rows from live Excel...", rowsToDeleteFromLive.Count);
                    foreach (int rowNum in rowsToDeleteFromLive.OrderByDescending(r => r))
                        ws.Row(rowNum).Delete();

                    int remainingRows = Math.Max(0, (ws.LastRowUsed()?.RowNumber() ?? 1) - 1); // subtract header

                    // ── Save the live workbook atomically ─────────────────────────────────
                    string tempSavePath = liveFilePath + $".{Guid.NewGuid():N}.tmp";
                    try
                    {
                        liveWb.SaveAs(tempSavePath);

                        // Dispose before moving to release file locks!
                        liveWb.Dispose();
                        liveWb = null;
                        liveFileStream.Dispose();
                        liveFileStream = null;

                        File.Move(tempSavePath, liveFilePath, overwrite: true);
                        _logger.LogInformation("[ArchiveService] Atomically replaced live Excel file.");
                    }
                    finally
                    {
                        if (File.Exists(tempSavePath))
                        {
                            try { File.Delete(tempSavePath); } catch {}
                        }
                    }

                    _logger.LogInformation(
                        "[ArchiveService] ══════════════════════════════════════════════\n" +
                        "  Total rows read       : {Total}\n" +
                        "  Past candidates       : {Candidates} (Interview DateTime < {Today})\n" +
                        "  Successfully archived : {Archived}\n" +
                        "  Rows deleted from live: {Deleted}\n" +
                        "  Remaining in live file: {Remaining}\n" +
                        "══════════════════════════════════════════════",
                        totalDataRows, candidateCount, today.ToString("yyyy-MM-dd"),
                        totalArchived, rowsToDeleteFromLive.Count, remainingRows);

                    // ── Mark daily gate now that we've succeeded ─────────────────────────
                    _lastArchivedDate = today;

                    // ── Sync DB context so in-memory state reflects the now-empty live file ─
                    // The live file was just written by ClosedXML; give the OS a moment to flush
                    // before any concurrent reader (background poller, etc.) tries to open it.
                    _logger.LogInformation("[ArchiveService] Synchronizing database context (post-archive)...");
                    Thread.Sleep(2000); // 2 s flush window

                    const int maxSyncAttempts = 3;
                    for (int attempt = 1; attempt <= maxSyncAttempts; attempt++)
                    {
                        try
                        {
                            using var scope = _scopeFactory.CreateScope();
                            var syncService = scope.ServiceProvider.GetRequiredService<ISyncInterviewDataService>();
                            syncService.SyncFromExcel("ArchiveService", replaceAll: true);
                            _logger.LogInformation("[ArchiveService] DB sync succeeded on attempt {Attempt}.", attempt);
                            break; // success — exit retry loop
                        }
                        catch (Exception syncEx) when (attempt < maxSyncAttempts)
                        {
                            _logger.LogWarning(
                                "[ArchiveService] DB sync attempt {Attempt}/{Max} failed ({Msg}). Retrying in 2 s...",
                                attempt, maxSyncAttempts, syncEx.Message);
                            Thread.Sleep(2000);
                        }
                        catch (Exception syncEx)
                        {
                            // All retries exhausted — ExcelFileWatcher already notified clients
                            // of the file change, so this is non-fatal.
                            _logger.LogWarning(
                                "[ArchiveService] DB sync failed after {Max} attempts: {Msg}. " +
                                "ExcelFileWatcher has already broadcast the change to clients.",
                                maxSyncAttempts, syncEx.Message);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[ArchiveService] Fatal error during archiving.");
                }
                finally
                {
                    liveWb?.Dispose();
                    liveFileStream?.Dispose();
                }
            }
        }
    }
}
