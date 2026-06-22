using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using RizvizERP.API.Hubs;
using RizvizERP.API.Models;

namespace RizvizERP.API.Services
{
    public class NotificationService
    {
        private readonly IHubContext<NotificationHub> _hubContext;

        public NotificationService(IHubContext<NotificationHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public async Task BroadcastInterviewChange(Interview existing, Interview updated, string actionUser)
        {
            try
            {
                string type = "Edited";
                string message = $"Interview with {updated.CompanyName} was updated by {actionUser}.";

                string changedField = "";
                string oldValue = "";
                string newValue = "";

                if (!string.Equals(existing.Status, updated.Status, StringComparison.OrdinalIgnoreCase))
                {
                    changedField = "Status";
                    oldValue = existing.Status;
                    newValue = updated.Status;

                    if (string.Equals(updated.Status, "Cancelled", StringComparison.OrdinalIgnoreCase))
                    {
                        type = "Cancelled";
                        message = $"Your interview with {updated.CompanyName} was cancelled.";
                    }
                    else if (string.Equals(updated.Status, "Rescheduled", StringComparison.OrdinalIgnoreCase))
                    {
                        type = "Rescheduled";
                        message = $"Your interview with {updated.CompanyName} was rescheduled.";
                    }
                }
                else if (existing.InterviewDate != updated.InterviewDate)
                {
                    changedField = "Interview Date";
                    oldValue = existing.InterviewDate?.ToString("yyyy-MM-dd HH:mm") ?? "N/A";
                    newValue = updated.InterviewDate?.ToString("yyyy-MM-dd HH:mm") ?? "N/A";
                }
                else
                {
                    changedField = "Data Change";
                    oldValue = "Previous Data";
                    newValue = "Updated Data";
                }

                var notification = new NotificationModel
                {
                    Id = Guid.NewGuid().ToString(),
                    Message = message,
                    Timestamp = DateTime.UtcNow,
                    Type = type,
                    TargetInterviewName = updated.IntervieweeName,
                    Sr = updated.Sr,
                    IntervieweeName = updated.IntervieweeName,
                    JobHunterName = updated.JobHunterName,
                    CompanyName = updated.CompanyName,
                    ChangedField = changedField,
                    OldValue = oldValue,
                    NewValue = newValue
                };

                await SendToEligibleConnections(notification, updated);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[NotificationService] Error broadcasting change: {ex.Message}");
            }
        }

        public async Task BroadcastNewInterview(Interview interview, string actionUser)
        {
            try
            {
                var notification = new NotificationModel
                {
                    Id = Guid.NewGuid().ToString(),
                    Message = $"A new interview with {interview.CompanyName} has been scheduled for {interview.IntervieweeName}.",
                    Timestamp = DateTime.UtcNow,
                    Type = "Added",
                    TargetInterviewName = interview.IntervieweeName,
                    Sr = interview.Sr,
                    IntervieweeName = interview.IntervieweeName,
                    JobHunterName = interview.JobHunterName,
                    CompanyName = interview.CompanyName,
                    ChangedField = "New Interview",
                    OldValue = "N/A",
                    NewValue = "Scheduled"
                };

                await SendToEligibleConnections(notification, interview);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[NotificationService] Error broadcasting new interview: {ex.Message}");
            }
        }

        public async Task SendToEligibleConnections(NotificationModel notification, Interview row)
        {
            int totalConnections = NotificationHub.Connections.Count;
            Console.WriteLine($"[NotificationService] ── SendToEligibleConnections ── Type={notification.Type} | TotalConnections={totalConnections}");

            // ── Diagnostic: dump every connected user and their group ─────────────
            Console.WriteLine($"[NotificationService] 👥 Connected users snapshot:");
            if (totalConnections == 0)
            {
                Console.WriteLine($"[NotificationService]   (no connections)");
            }
            else
            {
                foreach (var kvp in NotificationHub.Connections)
                {
                    var info = kvp.Value;
                    string userGroup = string.Equals(info.Role, "Admin", StringComparison.OrdinalIgnoreCase)
                        ? "Admins"
                        : info.InterviewName ?? "(none)";
                    Console.WriteLine($"[NotificationService]   connId={kvp.Key} | user='{info.Username}' | role='{info.Role}' | group='{userGroup}'");
                }
            }

            string targetInterviewee = row.IntervieweeName?.Trim() ?? "";
            string targetJobHunter   = row.JobHunterName?.Trim() ?? "";

            // Hex-dump to expose invisible characters / encoding issues
            string intervieweeHex = string.Join(" ", System.Text.Encoding.UTF8.GetBytes(targetInterviewee).Select(b => b.ToString("X2")));
            string jobHunterHex   = string.Join(" ", System.Text.Encoding.UTF8.GetBytes(targetJobHunter).Select(b => b.ToString("X2")));
            Console.WriteLine($"[NotificationService] 🔍 Row IntervieweeName: '{targetInterviewee}' | len={targetInterviewee.Length} | hex=[{intervieweeHex}]");
            Console.WriteLine($"[NotificationService] 🔍 Row JobHunterName:   '{targetJobHunter}' | len={targetJobHunter.Length} | hex=[{jobHunterHex}]");

            // Check if any connected user matches
            bool hasMatchingUser = NotificationHub.Connections.Values.Any(c =>
                string.Equals(c.InterviewName, targetInterviewee, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(c.InterviewName, targetJobHunter, StringComparison.OrdinalIgnoreCase));
            Console.WriteLine($"[NotificationService] {(hasMatchingUser ? "✅" : "⚠")} Any connected user matching this row: {hasMatchingUser}");


            // ── 1. Admins group — always notified, custom message format ──────────────
            string action = notification.Type switch
            {
                "Cancelled"   => "cancelled",
                "Rescheduled" => "rescheduled",
                "NewRow"      => "scheduled",
                "Added"       => "scheduled",
                "Deleted"     => "removed",
                _             => "changed"
            };
            string timeStr = DateTime.Now.ToString("hh:mm tt");
            string adminName = string.IsNullOrWhiteSpace(row.JobHunterName)
                ? row.IntervieweeName
                : $"{row.IntervieweeName} / {row.JobHunterName}";

            var adminNotification = new NotificationModel
            {
                Id                  = notification.Id,
                Timestamp           = notification.Timestamp,
                Type                = notification.Type,
                IsRead              = false,
                TargetInterviewName = notification.TargetInterviewName,
                Message             = $"{adminName} - interview with {row.CompanyName} was {action} at {timeStr}",

                Sr = row.Sr,
                IntervieweeName = row.IntervieweeName,
                JobHunterName = row.JobHunterName,
                CompanyName = row.CompanyName,
                ChangedField = notification.ChangedField,
                OldValue = notification.OldValue,
                NewValue = notification.NewValue
            };

            Console.WriteLine($"[NotificationService] 📤 Sending to 'Admins' group: \"{adminNotification.Message}\"");
            await _hubContext.Clients.Group("Admins").SendAsync("ReceiveNotification", adminNotification);
            Console.WriteLine($"[NotificationService] ✅ 'Admins' group send complete");

            // ── 2. Affected users groups (matched by interview_name) ──────────────────
            string rawInterviewee = row.IntervieweeName;
            string rawJobHunter = row.JobHunterName;
            
            Console.WriteLine($"[NotificationService] Raw row values: IntervieweeName='{rawInterviewee}', JobHunterName='{rawJobHunter}'");

            if (!string.IsNullOrWhiteSpace(rawInterviewee))
            {
                string groupName = rawInterviewee.Trim().ToLowerInvariant();
                Console.WriteLine($"[NotificationService] 📤 Target interviewee group name (trimmed/lowercased): '{groupName}' (Length={groupName.Length})");
                await _hubContext.Clients.Group(groupName).SendAsync("ReceiveNotification", notification);
                Console.WriteLine($"[NotificationService] ✅ Interviewee group '{groupName}' send complete");
            }

            if (!string.IsNullOrWhiteSpace(rawJobHunter))
            {
                string groupName = rawJobHunter.Trim().ToLowerInvariant();
                Console.WriteLine($"[NotificationService] 📤 Target job hunter group name (trimmed/lowercased): '{groupName}' (Length={groupName.Length})");
                
                string compareName = rawInterviewee?.Trim()?.ToLowerInvariant();
                if (!string.Equals(compareName, groupName, StringComparison.OrdinalIgnoreCase))
                {
                    await _hubContext.Clients.Group(groupName).SendAsync("ReceiveNotification", notification);
                    Console.WriteLine($"[NotificationService] ✅ Job Hunter group '{groupName}' send complete");
                }
                else
                {
                    Console.WriteLine($"[NotificationService] ℹ Skipping job hunter group send: matches interviewee name '{groupName}'");
                }
            }

            Console.WriteLine($"[NotificationService] ── SendToEligibleConnections DONE ──");
        }

        public void BroadcastSyncComplete(int inserted, int updated, int deleted, int failed, string message)
        {
            try
            {
                Task.Run(async () =>
                {
                    await _hubContext.Clients.All.SendAsync("ReceiveSyncComplete", new
                    {
                        insertedRows = inserted,
                        updatedRows = updated,
                        deletedRows = deleted,
                        failedRows = failed,
                        message = message
                    });
                    Console.WriteLine($"[NotificationService] 📤 Broadcasted ReceiveSyncComplete to all clients");
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[NotificationService] Error broadcasting sync complete: {ex.Message}");
            }
        }
    }
}
