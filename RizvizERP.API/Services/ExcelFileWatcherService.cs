using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RizvizERP.API.Controllers;
using RizvizERP.API.Hubs;
using RizvizERP.API.Models;

namespace RizvizERP.API.Services
{
    /// <summary>
    /// Singleton background service that watches last_uploaded_excel.xlsx for disk-level changes.
    /// When the file changes (e.g., admin edits and saves it in Excel), this service:
    ///   1. Debounces the event (waits for Excel to finish writing)
    ///   2. Computes a new MD5 hash and compares with the last known hash
    ///   3. Parses the new file and generates a diff
    ///   4. Pushes an "ExcelFileChanged" SignalR event to all Admin connections
    /// This means admins get an instant popup without needing to re-upload the file.
    /// </summary>
    public class ExcelFileWatcherService : IHostedService, IDisposable
    {
        private readonly IHubContext<NotificationHub> _hub;
        private readonly ILogger<ExcelFileWatcherService> _logger;

        private FileSystemWatcher _watcher;
        private Timer _debounceTimer;
        private readonly object _lock = new object();

        // Global state — shared across all sessions
        private static string _lastKnownHash = null;
        private static List<Interview> _lastKnownInterviews = new List<Interview>();

        private static readonly string WatchedFileName = "last_uploaded_excel.xlsx";

        public ExcelFileWatcherService(
            IHubContext<NotificationHub> hub,
            ILogger<ExcelFileWatcherService> logger)
        {
            _hub = hub;
            _logger = logger;
        }

        /// <summary>Allows other services to update the baseline when a fresh file is uploaded.</summary>
        public static void SetBaseline(string hash, List<Interview> interviews)
        {
            _lastKnownHash = hash;
            _lastKnownInterviews = interviews ?? new List<Interview>();
        }

        public static string GetLastKnownHash() => _lastKnownHash;

        public Task StartAsync(CancellationToken cancellationToken)
        {
            var watchDir = Directory.GetCurrentDirectory();
            var filePath = Path.Combine(watchDir, WatchedFileName);

            // Bootstrap baseline from whatever is already on disk
            if (File.Exists(filePath) && _lastKnownHash == null)
            {
                try
                {
                    _lastKnownHash = ComputeHash(filePath);
                    var parsed = SeedHelper.ParseInterviewFile(filePath);
                    _lastKnownInterviews = MapParsed(parsed);
                    _logger.LogInformation("[ExcelWatcher] Baseline loaded from disk: {Count} rows, hash={Hash}",
                        _lastKnownInterviews.Count, _lastKnownHash);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[ExcelWatcher] Could not load baseline from disk on startup.");
                }
            }

            try
            {
                _watcher = new FileSystemWatcher(watchDir)
                {
                    Filter = WatchedFileName,
                    NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.Size,
                    EnableRaisingEvents = true
                };

                _watcher.Changed += OnFileChanged;
                _watcher.Created += OnFileChanged;

                _logger.LogInformation("[ExcelWatcher] Watching '{Path}' for changes.", filePath);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ExcelWatcher] Failed to set up FileSystemWatcher.");
            }

            return Task.CompletedTask;
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            _watcher?.Dispose();
            _debounceTimer?.Dispose();
            return Task.CompletedTask;
        }

        public void Dispose()
        {
            _watcher?.Dispose();
            _debounceTimer?.Dispose();
        }

        private void OnFileChanged(object sender, FileSystemEventArgs e)
        {
            // Debounce: Excel saves the file multiple times in quick succession.
            // We wait 1.5 s after the last event before processing.
            lock (_lock)
            {
                _debounceTimer?.Dispose();
                _debounceTimer = new Timer(ProcessChange, null, TimeSpan.FromMilliseconds(1500), Timeout.InfiniteTimeSpan);
            }
        }

        private void ProcessChange(object state)
        {
            var filePath = Path.Combine(Directory.GetCurrentDirectory(), WatchedFileName);
            if (!File.Exists(filePath)) return;

            try
            {
                var newHash = ComputeHash(filePath);
                if (string.IsNullOrEmpty(newHash) || newHash == _lastKnownHash)
                    return; // No real change

                _logger.LogInformation("[ExcelWatcher] Hash changed: {Old} → {New}", _lastKnownHash, newHash);

                var parsed = SeedHelper.ParseInterviewFile(filePath);
                var newInterviews = MapParsed(parsed);

                var diff = SessionExcelManager.GenerateDiff(_lastKnownInterviews, newInterviews);

                // Update baseline
                _lastKnownHash = newHash;
                _lastKnownInterviews = newInterviews;

                // Also update all active sessions so check-changes doesn't double-fire
                UpdateAllSessions(newHash, newInterviews);

                if (!diff.HasChanges)
                {
                    _logger.LogInformation("[ExcelWatcher] Hash changed but no meaningful data differences.");
                    return;
                }

                _logger.LogInformation("[ExcelWatcher] Changes detected — {Ins} inserted, {Del} deleted, {Upd} updated. Broadcasting via SignalR.",
                    diff.Inserted.Count, diff.Deleted.Count, diff.Updated.Count);

                // Broadcast to all Admins via SignalR
                var payload = new
                {
                    hasChanges = true,
                    fileName = WatchedFileName,
                    inserted = diff.Inserted.Select(i => new {
                        i.Sr, i.IntervieweeName, i.CompanyName, i.Status,
                        InterviewDate = i.InterviewDate?.ToString("yyyy-MM-dd"),
                        i.JobHunterName
                    }),
                    deleted = diff.Deleted.Select(i => new {
                        i.Sr, i.IntervieweeName, i.CompanyName, i.Status,
                        InterviewDate = i.InterviewDate?.ToString("yyyy-MM-dd"),
                        i.JobHunterName
                    }),
                    updated = diff.Updated.Select(u => new {
                        u.Sr, u.CandidateName, u.CompanyName,
                        changes = u.Changes.Select(c => new { c.Field, c.OldValue, c.NewValue })
                    })
                };

                // Fire-and-forget SignalR broadcast to Admins group
                _ = _hub.Clients.Group("Admins").SendAsync("ExcelFileChanged", payload);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[ExcelWatcher] Error processing file change.");
            }
        }

        private static List<Interview> MapParsed(List<ParsedInterviewRow> parsed)
        {
            var result = new List<Interview>();
            var syncTime = DateTime.UtcNow;
            foreach (var p in parsed)
            {
                try
                {
                    var row = SeedHelper.MapParsedRow(p);
                    if (string.IsNullOrWhiteSpace(row.IntervieweeName)) continue;
                    row.InterviewCode = InterviewCodeHelper.BuildCode(row);
                    row.Status = InterviewCodeHelper.NormalizeStatus(row.Status, row.InterviewType);
                    row.LastSyncedAt = syncTime;
                    result.Add(row);
                }
                catch { /* skip bad rows */ }
            }
            return result;
        }

        private static void UpdateAllSessions(string newHash, List<Interview> newInterviews)
        {
            // Reflect the new state in any active upload sessions so check-changes won't double-fire
            // We use reflection-like access via the static state manager
            try
            {
                // Update all sessions that have uploaded files
                var field = typeof(SessionExcelManager)
                    .GetField("_sessions", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static);
                if (field?.GetValue(null) is System.Collections.Concurrent.ConcurrentDictionary<string, SessionExcelState> sessions)
                {
                    foreach (var session in sessions.Values)
                    {
                        if (session.HasUploaded)
                        {
                            session.Interviews = newInterviews;
                            session.LastFileHash = newHash;
                        }
                    }
                }
            }
            catch { /* best-effort */ }
        }

        private static string ComputeHash(string filePath)
        {
            try
            {
                using var md5 = MD5.Create();
                // Open with ReadWrite sharing so we don't block Excel from saving
                using var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                var hash = md5.ComputeHash(stream);
                return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
            }
            catch
            {
                return null;
            }
        }
    }
}
