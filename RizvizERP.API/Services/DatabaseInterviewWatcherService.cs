using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RizvizERP.API.Data;
using RizvizERP.API.Hubs;
using RizvizERP.API.Models;

namespace RizvizERP.API.Services
{
    /// <summary>
    /// Background watcher that monitors mkt.interview_detail in SQL Server.
    /// Whenever PowerBuilder or any external tool inserts or updates interviews,
    /// this service immediately detects the change and pushes real-time SignalR notifications
    /// to all connected clients and triggers UI updates.
    /// </summary>
    public class DatabaseInterviewWatcherService : BackgroundService
    {
        private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(3);

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly IConfiguration _configuration;
        private readonly ILogger<DatabaseInterviewWatcherService> _logger;

        private int _lastMaxSeqCode = 0;
        private DateTime? _lastMaxInsertTime = null;
        private int _lastRowCount = 0;
        private bool _isInitialized = false;

        public DatabaseInterviewWatcherService(
            IServiceScopeFactory scopeFactory,
            IHubContext<NotificationHub> hubContext,
            IConfiguration configuration,
            ILogger<DatabaseInterviewWatcherService> logger)
        {
            _scopeFactory = scopeFactory;
            _hubContext = hubContext;
            _configuration = configuration;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var isLiveInterviews = _configuration.GetValue<bool>("DatabaseSettings:UseLiveInterviewsView", true);
            if (!isLiveInterviews)
            {
                _logger.LogInformation("[DbWatcher] Live interviews view disabled in configuration. Service stopped.");
                return;
            }

            _logger.LogInformation("[DbWatcher] Started monitoring SQL Server for PowerBuilder interview changes (interval: {Seconds}s).", PollInterval.TotalSeconds);

            // Small initial delay so database contexts are ready
            await Task.Delay(TimeSpan.FromSeconds(4), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CheckForDatabaseChangesAsync(stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("[DbWatcher] Error checking database: {Message}", ex.Message);
                }

                await Task.Delay(PollInterval, stoppingToken);
            }
        }

        private async Task CheckForDatabaseChangesAsync(CancellationToken cancellationToken)
        {
            var connStr = _configuration.GetConnectionString("DefaultConnection");
            if (string.IsNullOrEmpty(connStr)) return;

            int currentMaxSeqCode = 0;
            DateTime? currentMaxInsertTime = null;
            int currentCount = 0;

            // Direct lightweight SQL query to check max sequence and count
            using (var conn = new SqlConnection(connStr))
            {
                await conn.OpenAsync(cancellationToken);
                var sql = @"SELECT 
                                ISNULL(MAX(interview_seq_code), 0) AS MaxSeq,
                                MAX(insert_time) AS MaxInsertTime,
                                COUNT(*) AS TotalCount
                            FROM mkt.interview_detail";

                using (var cmd = new SqlCommand(sql, conn))
                {
                    using (var reader = await cmd.ExecuteReaderAsync(cancellationToken))
                    {
                        if (await reader.ReadAsync(cancellationToken))
                        {
                            currentMaxSeqCode = reader.GetInt32(0);
                            currentMaxInsertTime = reader.IsDBNull(1) ? (DateTime?)null : reader.GetDateTime(1);
                            currentCount = reader.GetInt32(2);
                        }
                    }
                }
            }

            // First run: establish initial baseline
            if (!_isInitialized)
            {
                _lastMaxSeqCode = currentMaxSeqCode;
                _lastMaxInsertTime = currentMaxInsertTime;
                _lastRowCount = currentCount;
                _isInitialized = true;
                _logger.LogInformation("[DbWatcher] Initialized baseline: MaxSeq={MaxSeq}, Count={Count}, MaxTime={Time}",
                    _lastMaxSeqCode, _lastRowCount, _lastMaxInsertTime);
                return;
            }

            // Check if new rows were inserted or count changed
            bool hasNewInserts = currentMaxSeqCode > _lastMaxSeqCode;
            bool hasCountChange = currentCount != _lastRowCount;
            bool hasTimeChange = currentMaxInsertTime.HasValue &&
                                 (!_lastMaxInsertTime.HasValue || currentMaxInsertTime.Value > _lastMaxInsertTime.Value);

            if (hasNewInserts || hasCountChange || hasTimeChange)
            {
                _logger.LogInformation(
                    "[DbWatcher] Detected PowerBuilder DB changes: OldMax={OldSeq}->NewMax={NewSeq}, OldCount={OldCount}->NewCount={NewCount}",
                    _lastMaxSeqCode, currentMaxSeqCode, _lastRowCount, currentCount);

                int previousMaxSeq = _lastMaxSeqCode;
                _lastMaxSeqCode = currentMaxSeqCode;
                _lastMaxInsertTime = currentMaxInsertTime;
                _lastRowCount = currentCount;

                using var scope = _scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                var notificationService = scope.ServiceProvider.GetRequiredService<NotificationService>();

                // Fetch newly inserted interview records from live view
                if (hasNewInserts)
                {
                    try
                    {
                        var newInterviews = await dbContext.Interviews
                            .AsNoTracking()
                            .Where(i => i.Id > previousMaxSeq)
                            .OrderBy(i => i.Id)
                            .ToListAsync(cancellationToken);

                        foreach (var item in newInterviews)
                        {
                            _logger.LogInformation(
                                "[DbWatcher] Broadcasting new interview: Id={Id}, Company='{Company}', Candidate='{Candidate}', Status='{Status}'",
                                item.Id, item.CompanyName, item.IntervieweeName, item.Status);

                            await notificationService.BroadcastNewInterview(item, "PowerBuilder BD");
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning("[DbWatcher] Error fetching new interview details: {Message}", ex.Message);
                    }
                }

                // Broadcast generic change signal to all connected SignalR clients to refresh UI immediately
                try
                {
                    await _hubContext.Clients.All.SendAsync("InterviewsChanged", new
                    {
                        Action = "Refresh",
                        Timestamp = DateTime.UtcNow,
                        TotalCount = currentCount,
                        NewSeqCode = currentMaxSeqCode
                    }, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("[DbWatcher] Error sending InterviewsChanged SignalR: {Message}", ex.Message);
                }
            }
        }
    }
}
