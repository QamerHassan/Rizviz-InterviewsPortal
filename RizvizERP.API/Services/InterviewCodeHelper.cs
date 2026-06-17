using System;
using System.Security.Cryptography;
using System.Text;
using RizvizERP.API.Models;

namespace RizvizERP.API.Services
{
    public static class InterviewCodeHelper
    {
        /// <summary>Stable row id from Excel Sr — dates/names can change without creating a duplicate row.</summary>
        public static string BuildCode(Interview row)
        {
            if (!string.IsNullOrWhiteSpace(row.InterviewCode) &&
                row.InterviewCode.StartsWith("INT-SR-", StringComparison.OrdinalIgnoreCase))
                return row.InterviewCode.Trim();

            if (row.Sr.HasValue && row.Sr.Value > 0)
                return $"INT-SR-{row.Sr.Value}";

            var parts = new[]
            {
                row.InvTo ?? "",
                row.IntervieweeName ?? "",
                row.CompanyName ?? "",
                row.InterviewFor ?? ""
            };
            var raw = string.Join("|", parts).Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(raw.Replace("|", "")))
                raw = Guid.NewGuid().ToString("N");

            using var sha = SHA256.Create();
            var hash = sha.ComputeHash(Encoding.UTF8.GetBytes(raw));
            return "INT-" + BitConverter.ToString(hash).Replace("-", "").Substring(0, 12);
        }

        public static string NormalizeStatus(string status, string interviewType = null)
        {
            var s = (status ?? interviewType ?? "").Trim();
            if (string.IsNullOrEmpty(s)) return "Scheduled";

            s = s.ToLowerInvariant();
            if (s.Contains("cancel")) return "Cancelled";
            if (s.Contains("postpon") || s.Contains("resched")) return "Postponed";
            if (s.Contains("complet") || s.Contains("done") || s.Contains("closed")) return "Completed";
            if (s.Contains("sched")) return "Scheduled";
            return char.ToUpper(s[0]) + s.Substring(1);
        }
    }
}
