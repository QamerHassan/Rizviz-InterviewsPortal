using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using ClosedXML.Excel;
using RizvizERP.API.Models;

namespace RizvizERP.API.Services
{
    public static class InterviewExcelWriter
    {
        private static string GetExcelFilePath()
        {
            var lastUploadedPath = Path.Combine(
                Directory.GetCurrentDirectory(), "last_uploaded_excel.xlsx");
            
            if (File.Exists(lastUploadedPath))
                return lastUploadedPath;
            
            return null;  // No file uploaded yet — return null, show empty state
        }

        public static void UpdateRowAndLog(Interview existing, Interview updated, string username)
        {
            try
            {
                string excelPath = GetExcelFilePath();
                if (string.IsNullOrEmpty(excelPath) || !File.Exists(excelPath))
                {
                    return;
                }

                // Detect changes
                var changes = new List<string>();
                void CheckChange(string field, string oldVal, string newVal)
                {
                    if (oldVal != newVal && (oldVal ?? "") != (newVal ?? ""))
                    {
                        changes.Add($"{field}: '{oldVal}' -> '{newVal}'");
                        LogChangeToExcel(excelPath, existing.Sr, username, field, oldVal, newVal);
                    }
                }

                CheckChange("InvTo", existing.InvTo, updated.InvTo);
                CheckChange("InterviewFor", existing.InterviewFor, updated.InterviewFor);
                CheckChange("IntervieweeName", existing.IntervieweeName, updated.IntervieweeName);
                CheckChange("JobHunterName", existing.JobHunterName, updated.JobHunterName);
                CheckChange("CompanyName", existing.CompanyName, updated.CompanyName);
                CheckChange("InterviewType", existing.InterviewType, updated.InterviewType);
                CheckChange("Status", existing.Status, updated.Status);
                CheckChange("FirstSalary", existing.FirstSalary, updated.FirstSalary);
                CheckChange("JhSuggest", existing.JhSuggest, updated.JhSuggest);
                CheckChange("InterviewDate", existing.InterviewDate?.ToString("yyyy-MM-dd"), updated.InterviewDate?.ToString("yyyy-MM-dd"));
                CheckChange("JobStartDate", existing.JobStartDate?.ToString("yyyy-MM-dd"), updated.JobStartDate?.ToString("yyyy-MM-dd"));
                CheckChange("JobCloseDate", existing.JobCloseDate?.ToString("yyyy-MM-dd"), updated.JobCloseDate?.ToString("yyyy-MM-dd"));
                CheckChange("InterviewCharges", existing.InterviewCharges.ToString(), updated.InterviewCharges.ToString());
                CheckChange("JhDue", existing.JhDue.ToString(), updated.JhDue.ToString());
                CheckChange("FirstPaymentOnJob", existing.FirstPaymentOnJob.ToString(), updated.FirstPaymentOnJob.ToString());
                CheckChange("SecondPaymentOnJob", existing.SecondPaymentOnJob.ToString(), updated.SecondPaymentOnJob.ToString());
                CheckChange("BalancePayable", existing.BalancePayable.ToString(), updated.BalancePayable.ToString());

                if (changes.Count == 0) return;

                // Open workbook and update the main data sheet
                using var wb = new XLWorkbook(excelPath);
                var ws = wb.Worksheets.FirstOrDefault(w => w.Name.Contains("Interview") || w.Name.Contains("data")) ?? wb.Worksheets.First();
                
                // Find the row by SR
                if (existing.Sr.HasValue)
                {
                    // Note: This relies on the 'Sr' column being roughly in column B, but let's be robust
                    // Since SeedHelper maps it, we can search for the row where column B (or wherever Sr is) matches
                    // Alternatively, search all rows for matching Sr.
                    var rows = ws.RowsUsed().Skip(1);
                    IXLRow targetRow = null;
                    int srColIndex = -1;
                    
                    // Find SR column index from header
                    var headerRow = ws.RowsUsed().FirstOrDefault(r => string.Join("", r.CellsUsed().Select(c => c.GetString())).Contains("INTERVIEWEE"));
                    if (headerRow != null)
                    {
                        for(int c=1; c<=50; c++)
                        {
                            var headerVal = headerRow.Cell(c).GetString()?.ToLower().Trim() ?? "";
                            if (headerVal == "sr." || headerVal == "sr") srColIndex = c;
                        }
                    }

                    if (srColIndex > 0)
                    {
                        foreach (var r in rows)
                        {
                            if (int.TryParse(r.Cell(srColIndex).GetString(), out int cellSr) && cellSr == existing.Sr.Value)
                            {
                                targetRow = r;
                                break;
                            }
                        }
                    }

                    if (targetRow != null)
                    {
                        // Map updated properties to columns based on standard Rizviz format
                        // Typical format: 1=InvTo, 2=Sr, 3=JobHunterName, 4=InterviewFor, 5=IntervieweeName, 6=CompanyName, 
                        // 7=JobStartDate, 8=JobCloseDate, 9=InterviewType, 10=FirstSalary, 11=JhSuggest, 12=InterviewCharges, 13=JhDue, 14=FirstPaymentOnJob, 15=SecondPaymentOnJob, 16=BalancePayable

                        // Let's do a simple overwrite for standard columns:
                        if (headerRow != null)
                        {
                            for(int c=1; c<=20; c++)
                            {
                                var h = headerRow.Cell(c).GetString()?.ToLower().Trim() ?? "";
                                if (h == "inv. to" || h == "inv to") targetRow.Cell(c).Value = updated.InvTo;
                                if (h == "job hunter name:" || h == "job hunter name") targetRow.Cell(c).Value = updated.JobHunterName;
                                if (h == "interview for :" || h == "interview for") targetRow.Cell(c).Value = updated.InterviewFor;
                                if (h == "interviewee name :" || h == "interviewee name") targetRow.Cell(c).Value = updated.IntervieweeName;
                                if (h == "company name :" || h == "company name") targetRow.Cell(c).Value = updated.CompanyName;
                                if (h == "job start date") targetRow.Cell(c).Value = updated.JobStartDate;
                                if (h == "job close date") targetRow.Cell(c).Value = updated.JobCloseDate;
                                if (h == "interview type") targetRow.Cell(c).Value = updated.InterviewType;
                                if (h == "first salary") targetRow.Cell(c).Value = updated.FirstSalary;
                                if (h == "jh suggest") targetRow.Cell(c).Value = updated.JhSuggest;
                                if (h == "interview charges") targetRow.Cell(c).Value = updated.InterviewCharges;
                                if (h == "jh due") targetRow.Cell(c).Value = updated.JhDue;
                                if (h == "first payment on job") targetRow.Cell(c).Value = updated.FirstPaymentOnJob;
                                if (h == "second payment on job") targetRow.Cell(c).Value = updated.SecondPaymentOnJob;
                                if (h == "balance payable") targetRow.Cell(c).Value = updated.BalancePayable;
                            }
                        }
                    }
                }

                wb.Save();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[InterviewExcelWriter] Error writing back to Excel: {ex.Message}");
            }
        }

        private static void LogChangeToExcel(string excelPath, int? sr, string username, string field, string oldVal, string newVal)
        {
            try
            {
                using var wb = new XLWorkbook(excelPath);
                var logSheet = wb.Worksheets.FirstOrDefault(w => w.Name.Equals("Change_Log", StringComparison.OrdinalIgnoreCase));
                if (logSheet == null)
                {
                    logSheet = wb.Worksheets.Add("Change_Log");
                    logSheet.Cell(1, 1).Value = "Timestamp";
                    logSheet.Cell(1, 2).Value = "Row_SR";
                    logSheet.Cell(1, 3).Value = "Changed_By";
                    logSheet.Cell(1, 4).Value = "Field_Name";
                    logSheet.Cell(1, 5).Value = "Old_Value";
                    logSheet.Cell(1, 6).Value = "New_Value";
                    logSheet.Range("A1:F1").Style.Font.Bold = true;
                }

                int nextRow = logSheet.LastRowUsed()?.RowNumber() + 1 ?? 2;
                logSheet.Cell(nextRow, 1).Value = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
                logSheet.Cell(nextRow, 2).Value = sr?.ToString() ?? "";
                logSheet.Cell(nextRow, 3).Value = username;
                logSheet.Cell(nextRow, 4).Value = field;
                logSheet.Cell(nextRow, 5).Value = oldVal ?? "";
                logSheet.Cell(nextRow, 6).Value = newVal ?? "";

                wb.Save();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[InterviewExcelWriter] Error writing to Change_Log: {ex.Message}");
            }
        }
    }
}
