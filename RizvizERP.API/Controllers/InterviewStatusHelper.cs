using System;
using RizvizERP.API.Models;

namespace RizvizERP.API.Controllers
{
    public static class InterviewStatusHelper
    {
        public static string ComputeStatus(Interview i)
        {
            if (i.JobStartDate.HasValue)
                return "Converted";

            if (i.JobCloseDate.HasValue)
            {
                var suggest = i.JhSuggest?.ToLowerInvariant() ?? "";
                if (suggest.Contains("reject"))
                    return "Rejected";
                return "Dead";
            }

            var interviewDate = i.InterviewDate ?? i.JobStartDate;
            if (interviewDate.HasValue && interviewDate.Value.Date > DateTime.Today)
                return "Upcoming";

            return "Unresponsed";
        }

        public static string MapRound(string interviewType)
        {
            if (string.IsNullOrWhiteSpace(interviewType))
                return "1st";
            var t = interviewType.Trim();
            if (t.Equals("Final Round", StringComparison.OrdinalIgnoreCase)) return "Final";
            if (t.Equals("HR Screening", StringComparison.OrdinalIgnoreCase) ||
                t.Equals("HR screening", StringComparison.OrdinalIgnoreCase)) return "HR";
            if (t.Equals("Technical", StringComparison.OrdinalIgnoreCase)) return "Tech";
            if (t.Equals("Management", StringComparison.OrdinalIgnoreCase)) return "Mgmt";
            return t.Length > 12 ? t.Substring(0, 12) : t;
        }

        public static string MapPipeline(Interview i) =>
            !string.IsNullOrWhiteSpace(i.JhSuggest) ? i.JhSuggest.Trim()
            : !string.IsNullOrWhiteSpace(i.InterviewType) ? i.InterviewType.Trim()
            : "Active";
    }
}
