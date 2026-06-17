using System.Collections.Generic;
using System.Threading.Tasks;
using RizvizERP.API.Models;

namespace RizvizERP.API.Services
{
    public interface IGoogleSheetsService
    {
        /// <summary>
        /// Appends a feedback row to Google Sheets.
        /// Returns (success, errorMessage).
        /// </summary>
        Task<(bool Success, string Error)> AppendFeedbackAsync(GeneralFeedback feedback);
        Task<(bool Success, string Error)> AppendInterviewFeedbackAsync(InterviewFeedbackRow row);
        Task<(bool Success, string Error)> AppendRowAsync(string spreadsheetId, string sheetName, List<string> rowData);
        Task<IList<IList<object>>> ReadAllRowsAsync(string spreadsheetId, string sheetName);
        Task<(bool Success, string Error)> SyncExcelToSheetsAsync();
        Task<(bool Success, string Error)> UpdateInterviewFeedbackAsync(string intervieweeName, string companyName, string interviewType, string feedbackText, string recommendation);
        /// <summary>
        /// Updates an existing interview row in Google Sheets, or appends a new row if no match is found.
        /// </summary>
        Task<(bool Success, string Error)> SyncInterviewFeedbackToSheetAsync(InterviewFeedbackRow row);
        /// <summary>
        /// Clears Sheet1 (AI Feedback) and writes a fresh correct header row.
        /// </summary>
        Task<(bool Success, string Error)> ClearAndResetFeedbackSheetAsync();

        /// <summary>
        /// Deletes all rows in the "Interview Feedback" tab where Column S (feedback text) is empty.
        /// Keeps the header row and any row that has actual feedback. Deletes from bottom-up to avoid index shifting.
        /// </summary>
        Task<(bool Success, int DeletedCount, string Error)> DeleteRowsWithoutFeedbackAsync(string spreadsheetId, string sheetName);

        /// <summary>
        /// Scans the Google Sheet, matches row with Excel file, and backfills missing columns (G to R) if empty.
        /// </summary>
        Task<(bool Success, string Error)> BackfillMissingSheetDataAsync();
    }

    public class InterviewFeedbackRow
    {
        public int Sr { get; set; }
        public string CandidateName { get; set; }
        public string CompanyName { get; set; }
        public string InterviewerName { get; set; }
        public string InterviewDate { get; set; }
        public string InterviewType { get; set; }
        public string FeedbackText { get; set; }
        public int Rating { get; set; }
        public string Strengths { get; set; }
        public string Weaknesses { get; set; }
        public string Recommendation { get; set; }
        public string FeedbackBy { get; set; }
        public string FeedbackDate { get; set; }
        public string AiProcessedFeedback { get; set; }
    }
}
