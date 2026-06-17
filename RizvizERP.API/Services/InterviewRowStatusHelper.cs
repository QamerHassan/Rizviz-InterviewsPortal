using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using RizvizERP.API.Models;

namespace RizvizERP.API.Services
{
    /// <summary>
    /// Display status from Excel STATUS column (RawRowJson) when present; otherwise DB Status.
    /// </summary>
    public static class InterviewRowStatusHelper
    {
        private static readonly string[] PreferredKeys = { "STATUS", "Status", "Interview Status" };

        public static string GetDisplayStatus(Interview row)
        {
            if (row == null) return "Scheduled";

            if (!string.IsNullOrWhiteSpace(row.RawRowJson))
            {
                try
                {
                    using var doc = JsonDocument.Parse(row.RawRowJson);
                    var root = doc.RootElement;
                    if (root.ValueKind == JsonValueKind.Object)
                    {
                        foreach (var key in PreferredKeys)
                        {
                            if (root.TryGetProperty(key, out var el))
                            {
                                var v = ReadJsonString(el);
                                if (!string.IsNullOrWhiteSpace(v)) return v.Trim();
                            }
                        }

                        foreach (var prop in root.EnumerateObject())
                        {
                            var key = prop.Name.Trim().TrimEnd(':');
                            if (key.Equals("status", StringComparison.OrdinalIgnoreCase) ||
                                key.Equals("STATUS", StringComparison.OrdinalIgnoreCase))
                            {
                                var v = ReadJsonString(prop.Value);
                                if (!string.IsNullOrWhiteSpace(v)) return v.Trim();
                            }
                        }
                    }
                }
                catch
                {
                    // fall through to model Status
                }
            }

            return string.IsNullOrWhiteSpace(row.Status) ? "Scheduled" : row.Status.Trim();
        }

        private static string ReadJsonString(JsonElement el)
        {
            if (el.ValueKind == JsonValueKind.String) return el.GetString();
            if (el.ValueKind == JsonValueKind.Number) return el.GetRawText();
            return null;
        }

        public static bool MatchesAnyStatus(Interview row, HashSet<string> wanted)
        {
            if (wanted == null || wanted.Count == 0) return true;
            var display = GetDisplayStatus(row);
            return wanted.Contains(display);
        }

        public static List<Interview> ApplyUniqueCandidateMetric(List<Interview> items)
        {
            return items
                .FindAll(i => !string.IsNullOrWhiteSpace(i.IntervieweeName))
                .GroupBy(i => i.IntervieweeName.Trim().ToLowerInvariant())
                .Select(g => g.OrderByDescending(x => x.JobStartDate ?? x.InterviewDate).ThenByDescending(x => x.Id).First())
                .OrderByDescending(i => i.JobStartDate ?? i.InterviewDate)
                .ThenByDescending(i => i.Id)
                .ToList();
        }
    }
}
