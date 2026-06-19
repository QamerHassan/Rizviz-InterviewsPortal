using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RizvizERP.API.Configuration;

namespace RizvizERP.API.Services
{
    /// <summary>
    /// Polls Interview_Software.xlsx every 5 seconds.
    /// Uses file LastWriteTime as a cheap pre-check — the full parse+notify
    /// only runs when the file has actually been modified since the last sync.
    /// </summary>
    public class InterviewSyncBackgroundService : BackgroundService
    {
        private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(5);

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly InterviewSyncSettings _settings;
        private readonly ILogger<InterviewSyncBackgroundService> _logger;

        public InterviewSyncBackgroundService(
            IServiceScopeFactory scopeFactory,
            IOptions<InterviewSyncSettings> settings,
            ILogger<InterviewSyncBackgroundService> logger)
        {
            _scopeFactory = scopeFactory;
            _settings     = settings.Value;
            _logger       = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            if (!_settings.Enabled)
            {
                _logger.LogInformation("[AutoSync] Background poller is disabled by configuration.");
                return;
            }

            _logger.LogInformation(
                "[AutoSync] Background poller started — checking every {Seconds}s for Excel changes.",
                PollInterval.TotalSeconds);

            // Small initial delay so the app finishes starting up before the first check
            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var sync = scope.ServiceProvider.GetRequiredService<ISyncInterviewDataService>();

                    var result = sync.SyncFromExcel("AutoSync", replaceAll: false);

                    // UnchangedRows == -1 is the sentinel returned when the file timestamp
                    // hasn't changed — just a no-op poll, nothing to log noisily.
                    if (result.UnchangedRows != -1)
                    {
                        _logger.LogInformation(
                            "[AutoSync] File changed — synced: {New} new, {Updated} updated, {Unchanged} unchanged, {Failed} failed.",
                            result.InsertedRows, result.UpdatedRows,
                            result.UnchangedRows, result.FailedRows);

                        if (result.UpdatedRows > 0 || result.InsertedRows > 0)
                            _logger.LogInformation(
                                "[AutoSync] SignalR notifications dispatched for {Count} change(s).",
                                result.UpdatedRows + result.InsertedRows);
                    }
                    else
                    {
                        _logger.LogDebug("[AutoSync] No Excel changes detected — skipped.");
                    }
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[AutoSync] Poll iteration failed — will retry in {Seconds}s.", PollInterval.TotalSeconds);
                }

                await Task.Delay(PollInterval, stoppingToken);
            }

            _logger.LogInformation("[AutoSync] Background poller stopped.");
        }
    }
}
