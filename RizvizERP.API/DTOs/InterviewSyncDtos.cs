using System;
using System.Collections.Generic;

namespace RizvizERP.API.DTOs
{
    public class InterviewSyncResultDto
    {
        public int TotalRows { get; set; }
        public int InsertedRows { get; set; }
        public int UpdatedRows { get; set; }
        public int UnchangedRows { get; set; }
        public int FailedRows { get; set; }
        public DateTime SyncedAt { get; set; }
        public string SourcePath { get; set; }
        /// <summary>Last write time of the file on disk at sync (local time).</summary>
        public DateTime? SourceFileLastModified { get; set; }
        public string Message { get; set; }
        public List<string> Errors { get; set; } = new List<string>();
        public List<InterviewSyncChangeDto> Changes { get; set; } = new List<InterviewSyncChangeDto>();
    }

    public class InterviewSyncChangeDto
    {
        public int? Sr { get; set; }
        public string IntervieweeName { get; set; }
        public string CompanyName { get; set; }
        /// <summary>Data change, Reschedule, Cancel, Postpone, New row</summary>
        public string ChangeType { get; set; }
        public string Summary { get; set; }
        public List<string> FieldChanges { get; set; } = new List<string>();
        /// <summary>Full Excel row before sync (all columns).</summary>
        public Dictionary<string, string> OldRow { get; set; } = new Dictionary<string, string>();
        /// <summary>Full Excel row after sync (all columns).</summary>
        public Dictionary<string, string> NewRow { get; set; } = new Dictionary<string, string>();
        /// <summary>Pre-built before/after rows for UI (always populated on change).</summary>
        public List<InterviewSyncRowFieldDto> RowFields { get; set; } = new List<InterviewSyncRowFieldDto>();
    }

    public class InterviewSyncRowFieldDto
    {
        public string Column { get; set; }
        public string Before { get; set; }
        public string After { get; set; }
        public bool Changed { get; set; }
    }

    public class InterviewSyncStatusDto
    {
        public DateTime? LastSyncedAt { get; set; }
        public string SourcePath { get; set; }
        public DateTime? SourceFileLastModified { get; set; }
        public int TotalRows { get; set; }
        public int InsertedRows { get; set; }
        public int UpdatedRows { get; set; }
        public bool AutoSyncEnabled { get; set; }
        public int SyncIntervalMinutes { get; set; }
    }

    public class InterviewHistoryDto
    {
        public int Id { get; set; }
        public int InterviewId { get; set; }
        public string InterviewCode { get; set; }
        public string OldStatus { get; set; }
        public string NewStatus { get; set; }
        public string OldRecruiter { get; set; }
        public string NewRecruiter { get; set; }
        public DateTime? OldInterviewDate { get; set; }
        public DateTime? NewInterviewDate { get; set; }
        public string ChangedBy { get; set; }
        public DateTime ChangedAt { get; set; }
        public string ChangeSummary { get; set; }
    }
}
