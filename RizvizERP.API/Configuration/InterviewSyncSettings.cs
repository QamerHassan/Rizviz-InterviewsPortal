namespace RizvizERP.API.Configuration
{
    public class InterviewSyncSettings
    {
        public const string SectionName = "InterviewSync";

        public bool Enabled { get; set; } = true;
        public string NetworkFilePath { get; set; } = @"\\OfficePC\InterviewData\interviews.xlsx";
        /// <summary>File name in repo root (e.g. Interview Software.xlsx) or full path. Refresh always uses this file when it exists.</summary>
        public string PreferredLocalFile { get; set; } = "Interview Software.xlsx";
        public int SyncIntervalMinutes { get; set; } = 5;
        /// <summary>When true, API reads/writes dbo.Rizviz_Interviews (Excel sync) instead of UAT live view.</summary>
        public bool UseSyncedDataForApi { get; set; } = true;
        /// <summary>Replace all interview rows from file on manual refresh (no merge with old/mock data).</summary>
        public bool ReplaceAllOnRefresh { get; set; } = true;
    }
}
