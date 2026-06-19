using System.Collections.Generic;
using RizvizERP.API.DTOs;

namespace RizvizERP.API.Services
{
    public interface ISyncInterviewDataService
    {
        InterviewSyncResultDto SyncFromExcel(string changedBy = "ExcelSync", bool? replaceAll = null, string uploadFilePath = null);
        InterviewSyncStatusDto GetSyncStatus();
        List<InterviewHistoryDto> GetInterviewHistory(int interviewId);
        InterviewSyncResultDto GetLastSyncResult();
    }
}
