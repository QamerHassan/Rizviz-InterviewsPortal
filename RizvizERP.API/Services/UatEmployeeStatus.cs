using System;
using System.Collections.Generic;

namespace RizvizERP.API.Services
{
    /// <summary>
    /// Maps hrms.entity.EmpStatus_Code / EmployeeStatuses lookup to UI buckets.
    /// </summary>
    public static class UatEmployeeStatus
    {
        public const string GroupAll = "all";
        public const string GroupActive = "active";
        public const string GroupSuspended = "suspended";
        public const string GroupTerminated = "terminated";

        public static string Normalize(string status)
        {
            if (string.IsNullOrWhiteSpace(status)) return "Active";

            var s = status.Trim();
            return s switch
            {
                "1" => "Active",
                "2" => "In Active",
                "3" => "Probation",
                "4" => "Resigned",
                "5" => "Terminated",
                "6" => "Suspended",
                "7" => "Internal Transferred",
                "8" => "Exit in Progress",
                _ => s
            };
        }

        public static string GetGroup(string status)
        {
            var normalized = Normalize(status);
            if (normalized.Equals("Active", StringComparison.OrdinalIgnoreCase)
                || normalized.Equals("Probation", StringComparison.OrdinalIgnoreCase))
                return GroupActive;

            if (normalized.Equals("Resigned", StringComparison.OrdinalIgnoreCase)
                || normalized.Equals("Terminated", StringComparison.OrdinalIgnoreCase)
                || normalized.Equals("Internal Transferred", StringComparison.OrdinalIgnoreCase))
                return GroupTerminated;

            if (normalized.Equals("In Active", StringComparison.OrdinalIgnoreCase)
                || normalized.Equals("Suspended", StringComparison.OrdinalIgnoreCase)
                || normalized.Equals("Exit in Progress", StringComparison.OrdinalIgnoreCase))
                return GroupSuspended;

            // Unknown / legacy text — treat as active headcount
            return GroupActive;
        }

        public static bool MatchesGroup(string status, string group)
        {
            if (string.IsNullOrEmpty(group) || group == GroupAll) return true;
            return GetGroup(status) == group;
        }

        public static IReadOnlyList<string> RawCodesForGroup(string group) => group switch
        {
            GroupActive => new[] { "1", "3", "Active", "Probation", "A" },
            GroupSuspended => new[] { "2", "6", "8", "In Active", "Suspended", "Exit in Progress" },
            GroupTerminated => new[] { "4", "5", "7", "Resigned", "Terminated", "Internal Transferred" },
            _ => Array.Empty<string>()
        };
    }
}
