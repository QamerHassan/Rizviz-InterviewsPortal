using System;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace RizvizERP.API.Services
{
    public interface IEmailService
    {
        Task<bool> SendEmailAsync(string toEmail, string subject, string bodyHtml);
        Task SendInterviewRequestNotificationAsync(string developerName, string developerEmail, string companyName, DateTime date, string timeSlot, string timeZone, string requestedBy);
        Task SendRequestResponseNotificationToAdminAsync(string adminEmail, string developerName, string companyName, DateTime date, string status, string rejectionReason);
        Task SendRescheduleNotificationAsync(string developerEmail, string developerName, string companyName, DateTime newDate, string newTimeSlot, string newTimeZone, string reason);
    }

    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration config, ILogger<EmailService> logger)
        {
            _config = config;
            _logger = logger;
        }

        public async Task<bool> SendEmailAsync(string toEmail, string subject, string bodyHtml)
        {
            try
            {
                var enabled = _config.GetValue<bool>("EmailSettings:Enabled", false);
                var host = _config["EmailSettings:SmtpHost"];
                var port = _config.GetValue<int>("EmailSettings:SmtpPort", 587);
                var username = _config["EmailSettings:Username"];
                var password = _config["EmailSettings:Password"];
                var senderEmail = _config["EmailSettings:SenderEmail"] ?? "noreply@rizvizerp.com";
                var senderName = _config["EmailSettings:SenderName"] ?? "Rizviz ERP Notifications";
                var enableSsl = _config.GetValue<bool>("EmailSettings:EnableSsl", true);

                if (!enabled || string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(toEmail))
                {
                    _logger.LogInformation($"[EmailService] Email sending skipped (Enabled={enabled}, Host={host}, To={toEmail}). Subject: {subject}");
                    return true;
                }

                using var message = new MailMessage
                {
                    From = new MailAddress(senderEmail, senderName),
                    Subject = subject,
                    Body = bodyHtml,
                    IsBodyHtml = true
                };
                message.To.Add(toEmail);

                using var client = new SmtpClient(host, port)
                {
                    EnableSsl = enableSsl,
                    Credentials = (!string.IsNullOrEmpty(username) && !string.IsNullOrEmpty(password))
                        ? new NetworkCredential(username, password)
                        : CredentialCache.DefaultNetworkCredentials
                };

                await client.SendMailAsync(message);
                _logger.LogInformation($"[EmailService] Email sent successfully to {toEmail}. Subject: {subject}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"[EmailService] Failed to send email to {toEmail}. Subject: {subject}");
                return false;
            }
        }

        public async Task SendInterviewRequestNotificationAsync(string developerName, string developerEmail, string companyName, DateTime date, string timeSlot, string timeZone, string requestedBy)
        {
            string subject = $"🎯 New Interview Request: {companyName} - {date:MMM dd, yyyy}";
            string body = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;'>
                    <h2 style='color: #4f46e5;'>New Interview Request</h2>
                    <p>Hello <strong>{developerName}</strong>,</p>
                    <p>You have received a new interview request from <strong>{requestedBy}</strong>.</p>
                    <table style='width: 100%; border-collapse: collapse; margin: 20px 0;'>
                        <tr><td style='padding: 8px; font-weight: bold; width: 120px;'>Company:</td><td style='padding: 8px;'>{companyName}</td></tr>
                        <tr><td style='padding: 8px; font-weight: bold;'>Date:</td><td style='padding: 8px;'>{date:dddd, MMMM dd, yyyy}</td></tr>
                        <tr><td style='padding: 8px; font-weight: bold;'>Time Slot:</td><td style='padding: 8px;'>{timeSlot ?? "To be confirmed"}</td></tr>
                        <tr><td style='padding: 8px; font-weight: bold;'>Time Zone:</td><td style='padding: 8px;'>{timeZone ?? "PKT (UTC+5)"}</td></tr>
                    </table>
                    <p>Please log in to your Rizviz ERP portal to <strong>Accept</strong> or <strong>Reject</strong> this request.</p>
                    <br/>
                    <p style='color: #888; font-size: 12px;'>Rizviz ERP System Notification</p>
                </div>";

            await SendEmailAsync(developerEmail, subject, body);
        }

        public async Task SendRequestResponseNotificationToAdminAsync(string adminEmail, string developerName, string companyName, DateTime date, string status, string rejectionReason)
        {
            bool isAccepted = string.Equals(status, "Accepted", StringComparison.OrdinalIgnoreCase);
            string subject = isAccepted
                ? $"✅ Interview Accepted: {developerName} - {companyName}"
                : $"❌ Interview Rejected: {developerName} - {companyName}";

            string statusColor = isAccepted ? "#10b981" : "#ef4444";
            string reasonHtml = !isAccepted && !string.IsNullOrWhiteSpace(rejectionReason)
                ? $"<p style='background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 6px;'><strong>Reason for Rejection:</strong> {rejectionHtmlEncode(rejectionReason)}</p>"
                : "";

            string body = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;'>
                    <h2 style='color: {statusColor};'>Interview Request {status}</h2>
                    <p>Developer <strong>{developerName}</strong> has <strong>{status.ToUpper()}</strong> the interview request for <strong>{companyName}</strong> on {date:MMM dd, yyyy}.</p>
                    {reasonHtml}
                    <p>You can view full details or re-assign from the Rizviz ERP Interview Assignment dashboard.</p>
                    <br/>
                    <p style='color: #888; font-size: 12px;'>Rizviz ERP System Notification</p>
                </div>";

            await SendEmailAsync(adminEmail, subject, body);
        }

        public async Task SendRescheduleNotificationAsync(string developerEmail, string developerName, string companyName, DateTime newDate, string newTimeSlot, string newTimeZone, string reason)
        {
            string subject = $"📅 Interview Rescheduled: {companyName} - {newDate:MMM dd, yyyy}";
            string reasonHtml = !string.IsNullOrWhiteSpace(reason)
                ? $"<p style='background: #fef3c7; color: #92400e; padding: 10px; border-radius: 6px;'><strong>Note from Admin:</strong> {rejectionHtmlEncode(reason)}</p>"
                : "";

            string body = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;'>
                    <h2 style='color: #0891b2;'>Interview Rescheduled</h2>
                    <p>Hello <strong>{developerName}</strong>,</p>
                    <p>Your interview with <strong>{companyName}</strong> has been rescheduled by Admin.</p>
                    {reasonHtml}
                    <table style='width: 100%; border-collapse: collapse; margin: 20px 0;'>
                        <tr><td style='padding: 8px; font-weight: bold; width: 120px;'>Company:</td><td style='padding: 8px;'>{companyName}</td></tr>
                        <tr><td style='padding: 8px; font-weight: bold;'>New Date:</td><td style='padding: 8px;'>{newDate:dddd, MMMM dd, yyyy}</td></tr>
                        <tr><td style='padding: 8px; font-weight: bold;'>New Time Slot:</td><td style='padding: 8px;'>{newTimeSlot ?? "To be confirmed"}</td></tr>
                        <tr><td style='padding: 8px; font-weight: bold;'>Time Zone:</td><td style='padding: 8px;'>{newTimeZone ?? "PKT (UTC+5)"}</td></tr>
                    </table>
                    <p>Your portal calendar has been automatically updated with the new schedule.</p>
                    <br/>
                    <p style='color: #888; font-size: 12px;'>Rizviz ERP System Notification</p>
                </div>";

            await SendEmailAsync(developerEmail, subject, body);
        }

        private static string rejectionHtmlEncode(string text)
        {
            return System.Net.WebUtility.HtmlEncode(text);
        }
    }
}
