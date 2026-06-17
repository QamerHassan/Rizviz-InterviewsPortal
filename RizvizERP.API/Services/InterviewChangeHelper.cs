using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using RizvizERP.API.DTOs;
using RizvizERP.API.Models;

namespace RizvizERP.API.Services
{
    public static class InterviewChangeHelper
    {
        public const string DataChange = "Data change";
        public const string Cancel = "Cancel";
        public const string Postpone = "Postpone";
        public const string Reschedule = "Reschedule";
        public const string NewRow = "New row";

        public static string DetectChangeType(Interview existing, Interview incoming, List<string> fieldChanges)
        {
            var oldStatus = (existing?.Status ?? "").Trim();
            var newStatus = (incoming?.Status ?? "").Trim();

            if (newStatus.Equals("Cancelled", StringComparison.OrdinalIgnoreCase) &&
                !oldStatus.Equals("Cancelled", StringComparison.OrdinalIgnoreCase))
                return Cancel;

            if (newStatus.Equals("Postponed", StringComparison.OrdinalIgnoreCase) &&
                !oldStatus.Equals("Postponed", StringComparison.OrdinalIgnoreCase))
                return Postpone;

            var jobStartChanged = existing?.JobStartDate?.Date != incoming?.JobStartDate?.Date;
            var interviewDateChanged = existing?.InterviewDate?.Date != incoming?.InterviewDate?.Date;
            var jobCloseChanged = existing?.JobCloseDate?.Date != incoming?.JobCloseDate?.Date;

            if (jobStartChanged || interviewDateChanged || jobCloseChanged)
            {
                if (fieldChanges.Exists(f => f.Contains("Job Start", StringComparison.OrdinalIgnoreCase) ||
                                             f.Contains("Interview Date", StringComparison.OrdinalIgnoreCase) ||
                                             f.Contains("Job Close", StringComparison.OrdinalIgnoreCase)))
                    return Reschedule;
            }

            if (!string.Equals(oldStatus, newStatus, StringComparison.OrdinalIgnoreCase) &&
                !string.IsNullOrWhiteSpace(newStatus))
                return DataChange;

            return fieldChanges.Count > 0 ? DataChange : DataChange;
        }

        public static List<string> CompareFields(Interview existing, Interview incoming)
        {
            var changes = new List<string>();

            void Add(string label, string oldVal, string newVal)
            {
                if (string.Equals(oldVal ?? "", newVal ?? "", StringComparison.OrdinalIgnoreCase)) return;
                changes.Add($"{label}: {Fmt(oldVal)} → {Fmt(newVal)}");
            }

            void AddDate(string label, DateTime? oldD, DateTime? newD)
            {
                if (oldD?.Date == newD?.Date) return;
                changes.Add($"{label}: {FmtDate(oldD)} → {FmtDate(newD)}");
            }

            void AddDec(string label, decimal oldV, decimal newV)
            {
                if (oldV == newV) return;
                changes.Add($"{label}: {oldV:N0} → {newV:N0}");
            }

            Add("Inv. To", existing.InvTo, incoming.InvTo);
            Add("Interviewee", existing.IntervieweeName, incoming.IntervieweeName);
            Add("Interview For", existing.InterviewFor, incoming.InterviewFor);
            Add("Job Hunter", existing.JobHunterName, incoming.JobHunterName);
            Add("Company", existing.CompanyName, incoming.CompanyName);
            Add("Interview Type", existing.InterviewType, incoming.InterviewType);
            Add("Status", existing.Status, incoming.Status);
            AddDate("DATE", existing.InterviewDate, incoming.InterviewDate);
            AddDate("Job Start Date", existing.JobStartDate, incoming.JobStartDate);
            AddDate("Job Close Date", existing.JobCloseDate, incoming.JobCloseDate);
            Add("JH Suggest", existing.JhSuggest, incoming.JhSuggest);
            AddDec("Interview Charges", existing.InterviewCharges, incoming.InterviewCharges);
            AddDec("JH Due", existing.JhDue, incoming.JhDue);
            AddDec("1st Payment", existing.FirstPaymentOnJob, incoming.FirstPaymentOnJob);
            AddDec("2nd Payment", existing.SecondPaymentOnJob, incoming.SecondPaymentOnJob);
            AddDec("Balance Payable", existing.BalancePayable, incoming.BalancePayable);

            return changes;
        }

        public static bool HasAnyChange(Interview existing, Interview incoming) =>
            CompareFields(existing, incoming).Count > 0;

        public static string BuildHistorySummary(string changeType, List<string> fieldChanges)
        {
            var sb = new StringBuilder();
            sb.Append('[').Append(changeType).Append("] ");
            sb.Append(string.Join("; ", fieldChanges));
            if (sb.Length > 500)
                return sb.ToString(0, 497) + "...";
            return sb.ToString().Trim();
        }

        private static string Fmt(string v) => string.IsNullOrWhiteSpace(v) ? "(empty)" : v.Trim();

        private static string FmtDate(DateTime? d) =>
            d.HasValue ? d.Value.ToString("dd-MMM-yyyy") : "(empty)";

        public static Dictionary<string, string> SnapshotRow(Interview row)
        {
            var merged = BuildModelSnapshot(row);
            if (string.IsNullOrWhiteSpace(row?.RawRowJson))
                return merged;

            try
            {
                using var doc = JsonDocument.Parse(row.RawRowJson);
                if (doc.RootElement.ValueKind == JsonValueKind.Object)
                {
                    foreach (var prop in doc.RootElement.EnumerateObject())
                        merged[prop.Name] = JsonValueToString(prop.Value);
                }
            }
            catch { /* use model snapshot only */ }

            return merged;
        }

        private static string JsonValueToString(JsonElement el)
        {
            return el.ValueKind switch
            {
                JsonValueKind.Null or JsonValueKind.Undefined => "",
                JsonValueKind.String => el.GetString() ?? "",
                JsonValueKind.Number => el.TryGetInt64(out var i) ? i.ToString() : el.GetDouble().ToString(),
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                _ => el.ToString()
            };
        }

        public static List<InterviewSyncRowFieldDto> BuildRowFields(
            Dictionary<string, string> oldRow,
            Dictionary<string, string> newRow,
            List<string> fieldChanges,
            bool isNewRowOnly = false)
        {
            var result = new List<InterviewSyncRowFieldDto>();
            var keys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var k in oldRow.Keys.Where(k => !string.IsNullOrWhiteSpace(k))) keys.Add(k);
            foreach (var k in newRow.Keys.Where(k => !string.IsNullOrWhiteSpace(k))) keys.Add(k);

            if (keys.Count > 0)
            {
                foreach (var key in keys.OrderBy(k => k, StringComparer.OrdinalIgnoreCase))
                {
                    oldRow.TryGetValue(key, out var before);
                    newRow.TryGetValue(key, out var after);
                    var b = NormalizeDisplay(before);
                    var a = NormalizeDisplay(after);
                    result.Add(new InterviewSyncRowFieldDto
                    {
                        Column = key,
                        Before = isNewRowOnly ? "" : b,
                        After = a,
                        Changed = !isNewRowOnly && !string.Equals(b, a, StringComparison.OrdinalIgnoreCase)
                    });
                }
                return result;
            }

            foreach (var line in fieldChanges)
                TryParseFieldChangeLine(line, result);

            return result;
        }

        private static void TryParseFieldChangeLine(string line, List<InterviewSyncRowFieldDto> result)
        {
            if (string.IsNullOrWhiteSpace(line)) return;
            line = Regex.Replace(line, @"^\[[^\]]+\]\s*", "").Trim();
            var m = Regex.Match(line, @"^([^:]+):\s*(.+?)\s*→\s*(.+)$");
            if (!m.Success) return;
            result.Add(new InterviewSyncRowFieldDto
            {
                Column = m.Groups[1].Value.Trim(),
                Before = m.Groups[2].Value.Trim(),
                After = m.Groups[3].Value.Trim(),
                Changed = true
            });
        }

        private static string NormalizeDisplay(string v) =>
            string.IsNullOrWhiteSpace(v) ? "—" : v.Trim();

        private static Dictionary<string, string> BuildModelSnapshot(Interview row)
        {
            if (row == null) return new Dictionary<string, string>();

            return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["Sr."] = row.Sr?.ToString() ?? "",
                ["Inv. To"] = row.InvTo ?? "",
                ["DATE"] = row.InterviewDate?.ToString("dd-MMM-yyyy") ?? "",
                ["INTERVIEW FOR"] = row.InterviewFor ?? "",
                ["INTERVIEWEE NAME"] = row.IntervieweeName ?? "",
                ["Job Hunter Name"] = row.JobHunterName ?? "",
                ["COMPANY NAME"] = row.CompanyName ?? "",
                ["Interview Type"] = row.InterviewType ?? "",
                ["Job Start Date"] = row.JobStartDate?.ToString("dd-MMM-yyyy") ?? "",
                ["Job Close Date"] = row.JobCloseDate?.ToString("dd-MMM-yyyy") ?? "",
                ["Status"] = row.Status ?? "",
                ["JH Suggest"] = row.JhSuggest ?? "",
                ["Interview Charges"] = row.InterviewCharges.ToString("N0"),
                ["JH Due"] = row.JhDue.ToString("N0"),
                ["1st Payment on Job"] = row.FirstPaymentOnJob.ToString("N0"),
                ["2nd Payment on Job"] = row.SecondPaymentOnJob.ToString("N0"),
                ["Bal. Payable"] = row.BalancePayable.ToString("N0"),
            };
        }
    }
}
