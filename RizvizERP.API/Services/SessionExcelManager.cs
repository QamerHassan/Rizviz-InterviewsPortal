using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using RizvizERP.API.Models;
using RizvizERP.API.Controllers;

namespace RizvizERP.API.Services
{
    public class SessionExcelState
    {
        public string SessionId { get; set; }
        public string Username { get; set; }
        public List<Interview> Interviews { get; set; } = new();
        public string LastFileHash { get; set; }
        public bool HasUploaded { get; set; }
        public DateTime? UploadedAt { get; set; }
        public string UploadedFileName { get; set; }
        public string TempUploadedFileName { get; set; }
        public string TempFilePath { get; set; }
    }

    public class ExcelDiffDto
    {
        public List<Interview> Inserted { get; set; } = new();
        public List<Interview> Deleted { get; set; } = new();
        public List<RowDiffDto> Updated { get; set; } = new();
        public bool HasChanges => Inserted.Count > 0 || Deleted.Count > 0 || Updated.Count > 0;
    }

    public class RowDiffDto
    {
        public int Sr { get; set; }
        public string CandidateName { get; set; }
        public string CompanyName { get; set; }
        public List<CellDiffDto> Changes { get; set; } = new();
    }

    public class CellDiffDto
    {
        public string Field { get; set; }
        public string OldValue { get; set; }
        public string NewValue { get; set; }
    }

    public static class SessionExcelManager
    {
        private static readonly ConcurrentDictionary<string, SessionExcelState> _sessions = new(StringComparer.OrdinalIgnoreCase);
        private static readonly ConcurrentDictionary<string, List<Interview>> _tempInterviews = new(StringComparer.OrdinalIgnoreCase);
        private static readonly ConcurrentDictionary<string, string> _tempFileHashes = new(StringComparer.OrdinalIgnoreCase);

        public static void SetTempInterviews(string sessionId, List<Interview> interviews)
        {
            if (!string.IsNullOrEmpty(sessionId))
                _tempInterviews[sessionId] = interviews;
        }

        public static List<Interview> GetTempInterviews(string sessionId)
        {
            if (string.IsNullOrEmpty(sessionId)) return null;
            _tempInterviews.TryGetValue(sessionId, out var interviews);
            return interviews;
        }

        public static void SetTempFileHash(string sessionId, string hash)
        {
            if (!string.IsNullOrEmpty(sessionId))
                _tempFileHashes[sessionId] = hash;
        }

        public static string GetTempFileHash(string sessionId)
        {
            if (string.IsNullOrEmpty(sessionId)) return null;
            _tempFileHashes.TryGetValue(sessionId, out var hash);
            return hash;
        }

        public static void ClearTemp(string sessionId)
        {
            if (!string.IsNullOrEmpty(sessionId))
            {
                _tempInterviews.TryRemove(sessionId, out _);
                _tempFileHashes.TryRemove(sessionId, out _);
            }
        }

        public static SessionExcelState GetOrCreateState(string sessionId, string username)
        {
            if (string.IsNullOrEmpty(sessionId)) return null;
            return _sessions.GetOrAdd(sessionId, id => new SessionExcelState 
            { 
                SessionId = id, 
                Username = username,
                HasUploaded = false
            });
        }

        public static SessionExcelState GetState(string sessionId)
        {
            if (string.IsNullOrEmpty(sessionId)) return null;
            _sessions.TryGetValue(sessionId, out var state);
            return state;
        }

        public static void ClearState(string sessionId)
        {
            if (!string.IsNullOrEmpty(sessionId))
            {
                _sessions.TryRemove(sessionId, out _);
            }
        }

        public static string ComputeFileHash(string filePath)
        {
            if (!File.Exists(filePath)) return "";
            try
            {
                using var md5 = MD5.Create();
                using var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                var hash = md5.ComputeHash(stream);
                return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
            }
            catch
            {
                return "";
            }
        }

        public static ExcelDiffDto GenerateDiff(List<Interview> oldList, List<Interview> newList)
        {
            var diff = new ExcelDiffDto();
            
            var oldDict = oldList
                .Where(x => x.Sr.HasValue)
                .GroupBy(x => x.Sr.Value)
                .ToDictionary(g => g.Key, g => g.First());

            var newDict = newList
                .Where(x => x.Sr.HasValue)
                .GroupBy(x => x.Sr.Value)
                .ToDictionary(g => g.Key, g => g.First());

            // Inserted
            foreach (var kvp in newDict)
            {
                if (!oldDict.ContainsKey(kvp.Key))
                {
                    diff.Inserted.Add(kvp.Value);
                }
            }

            // Deleted
            foreach (var kvp in oldDict)
            {
                if (!newDict.ContainsKey(kvp.Key))
                {
                    diff.Deleted.Add(kvp.Value);
                }
            }

            // Updated
            foreach (var kvp in newDict)
            {
                if (oldDict.TryGetValue(kvp.Key, out var oldRow))
                {
                    var rowChanges = CompareRowFields(oldRow, kvp.Value);
                    if (rowChanges.Count > 0)
                    {
                        diff.Updated.Add(new RowDiffDto
                        {
                            Sr = kvp.Key,
                            CandidateName = kvp.Value.IntervieweeName,
                            CompanyName = kvp.Value.CompanyName,
                            Changes = rowChanges
                        });
                    }
                }
            }

            return diff;
        }

        private static List<CellDiffDto> CompareRowFields(Interview oldRow, Interview newRow)
        {
            var changes = new List<CellDiffDto>();

            void Compare(string fieldName, string val1, string val2)
            {
                var s1 = val1?.Trim() ?? "";
                var s2 = val2?.Trim() ?? "";
                if (!string.Equals(s1, s2, StringComparison.OrdinalIgnoreCase))
                {
                    changes.Add(new CellDiffDto { Field = fieldName, OldValue = s1, NewValue = s2 });
                }
            }

            void CompareDate(string fieldName, DateTime? d1, DateTime? d2)
            {
                var s1 = d1?.ToString("yyyy-MM-dd") ?? "";
                var s2 = d2?.ToString("yyyy-MM-dd") ?? "";
                if (s1 != s2)
                {
                    changes.Add(new CellDiffDto { Field = fieldName, OldValue = s1, NewValue = s2 });
                }
            }

            Compare("IntervieweeName", oldRow.IntervieweeName, newRow.IntervieweeName);
            Compare("JobHunterName", oldRow.JobHunterName, newRow.JobHunterName);
            Compare("CompanyName", oldRow.CompanyName, newRow.CompanyName);
            Compare("Status", oldRow.Status, newRow.Status);
            Compare("InterviewType", oldRow.InterviewType, newRow.InterviewType);
            Compare("InvTo", oldRow.InvTo, newRow.InvTo);
            Compare("InterviewFor", oldRow.InterviewFor, newRow.InterviewFor);
            Compare("Stack", oldRow.Stack, newRow.Stack);
            CompareDate("InterviewDate", oldRow.InterviewDate, newRow.InterviewDate);
            CompareDate("JobStartDate", oldRow.JobStartDate, newRow.JobStartDate);
            CompareDate("JobCloseDate", oldRow.JobCloseDate, newRow.JobCloseDate);

            return changes;
        }
    }
}
