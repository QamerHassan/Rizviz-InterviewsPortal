using System;
using System.IO;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Text;
using ClosedXML.Excel;
using RizvizERP.API.Models;
using RizvizERP.API.Services;

namespace RizvizERP.API.Controllers
{
    public static class SeedHelper
    {
        private const int MaxColumns = 50;

        private static readonly Regex DateLikeCompanyPattern = new Regex(
            @"^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|\(blank\))$",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        public static readonly Dictionary<string, string[]> AliasMap = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            { "Sr", new[] { "sr.no", "sr no", "sr", "serial no", "srno", "serial" } },
            { "InvTo", new[] { "invoice to", "inv to", "invto" } },
            { "InterviewDateTime", new[] { "interviewdatetime", "interview date time", "interview date", "date" } },
            { "StackName", new[] { "stack name", "stack" } },
            { "InterviewFor", new[] { "interview for", "job profile", "role" } },
            { "IntervieweeName", new[] { "interviewee name", "candidate name", "candidate", "interviewee" } },
            { "JobHunterName", new[] { "job hunter name", "recruiter name", "recruiter", "job hunter" } },
            { "CompanyName", new[] { "company name", "client name", "company", "client" } },
            { "InterviewType", new[] { "interview type", "type" } },
            { "JobStartDate", new[] { "job start date", "start date" } },
            { "JobCloseDate", new[] { "job closed date", "job close date", "close date" } },
            { "Status", new[] { "status", "outcome" } },
            
            // Extra fields
            { "FirstSalary", new[] { "first salary", "salary" } },
            { "JhSuggest", new[] { "jh suggest", "suggest" } },
            { "InterviewCharges", new[] { "interview charges", "charges" } },
            { "JhDue", new[] { "jh due" } },
            { "FirstPaymentOnJob", new[] { "first payment on job", "first payment" } },
            { "SecondPaymentOnJob", new[] { "second payment on job", "second payment" } },
            { "BalancePayable", new[] { "balance payable", "balance" } }
        };

        public static string NormalizeHeaderForMatching(string h)
        {
            if (string.IsNullOrWhiteSpace(h)) return "";
            var normalized = h.Trim().ToLowerInvariant();
            
            var sb = new StringBuilder();
            foreach (char c in normalized)
            {
                if (char.IsLetterOrDigit(c))
                    sb.Append(c);
                else
                    sb.Append(' ');
            }
            
            return Regex.Replace(sb.ToString(), @"\s+", " ").Trim();
        }

        public static string GetCanonicalValue(ParsedInterviewRow row, string fieldName)
        {
            if (row?.ByHeader == null || !AliasMap.TryGetValue(fieldName, out var aliases))
                return null;

            var normalizedAliases = aliases.Select(NormalizeHeaderForMatching).ToHashSet(StringComparer.OrdinalIgnoreCase);

            foreach (var kvp in row.ByHeader)
            {
                var normalizedHeader = NormalizeHeaderForMatching(kvp.Key);
                if (normalizedAliases.Contains(normalizedHeader) && !string.IsNullOrWhiteSpace(kvp.Value))
                {
                    return kvp.Value.Trim();
                }
            }

            return null;
        }

        public static bool HasRequiredHeaders(List<string> headers, out List<string> missingRequired)
        {
            missingRequired = new List<string>();
            var normalizedHeaders = headers.Select(NormalizeHeaderForMatching).ToHashSet(StringComparer.OrdinalIgnoreCase);
            
            var intervieweeAliases = AliasMap["IntervieweeName"].Select(NormalizeHeaderForMatching);
            if (!intervieweeAliases.Any(a => normalizedHeaders.Contains(a)))
            {
                missingRequired.Add("IntervieweeName (Candidate Name)");
            }
            
            return missingRequired.Count == 0;
        }

        public static bool LooksLikeDateOrPlaceholder(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return true;
            value = value.Trim();
            if (value.Equals("(blank)", StringComparison.OrdinalIgnoreCase)) return true;
            if (DateLikeCompanyPattern.IsMatch(value)) return true;
            if (double.TryParse(value, out _) && value.Length > 4) return true;
            if (DateTime.TryParse(value, out _)) return true;
            return false;
        }

        public static string NormalizePersonName(string name) =>
            string.IsNullOrWhiteSpace(name) ? null : name.Trim();

        public static bool IsInterviewHeaderRow(string headerLine)
        {
            if (string.IsNullOrWhiteSpace(headerLine)) return false;
            var cells = headerLine.Split(new[] { ' ', ',', '\t', '|' }, StringSplitOptions.RemoveEmptyEntries);
            return IsInterviewHeaderRow(cells);
        }

        public static bool IsInterviewHeaderRow(IEnumerable<string> cells)
        {
            if (cells == null) return false;
            int matchCount = 0;
            foreach (var cell in cells)
            {
                if (string.IsNullOrWhiteSpace(cell)) continue;
                var norm = NormalizeHeaderForMatching(cell);
                var isMatch = AliasMap["IntervieweeName"].Any(a => NormalizeHeaderForMatching(a) == norm) ||
                              AliasMap["CompanyName"].Any(a => NormalizeHeaderForMatching(a) == norm) ||
                              AliasMap["JobHunterName"].Any(a => NormalizeHeaderForMatching(a) == norm) ||
                              AliasMap["InterviewFor"].Any(a => NormalizeHeaderForMatching(a) == norm);
                if (isMatch)
                {
                    matchCount++;
                }
            }
            return matchCount >= 2;
        }

        public static bool IsExcelShortFormatHeader(string headerLine) => IsInterviewHeaderRow(headerLine);

        public static List<ParsedInterviewRow> ParseInterviewFile(string filePath)
        {
            if (string.IsNullOrWhiteSpace(filePath)) return new List<ParsedInterviewRow>();
            var ext = Path.GetExtension(filePath)?.ToLowerInvariant();
            return ext == ".csv" ? ParseCsvParsed(filePath) : ReadXlsxParsed(filePath);
        }

        public static List<string[]> ParseCsv(string filePath) =>
            ParseCsvParsed(filePath).Select(r => r.ToColumnArray()).ToList();

        public static List<string[]> ReadXlsx(string filePath) =>
            ReadXlsxParsed(filePath).Select(r => r.ToColumnArray()).ToList();

        public static List<ParsedInterviewRow> ParseCsvParsed(string filePath)
        {
            var lines = ReadAllLinesAllowingShare(filePath);
            var result = new List<ParsedInterviewRow>();
            List<string> headers = null;

            for (int i = 0; i < lines.Length; i++)
            {
                if (string.IsNullOrWhiteSpace(lines[i])) continue;
                var cols = ParseCsvLine(lines[i]);

                if (headers == null && IsInterviewHeaderRow(cols))
                {
                    headers = cols.Select(NormalizeHeader).Where(h => !string.IsNullOrEmpty(h)).ToList();
                    continue;
                }

                if (headers == null) continue;
                var row = BuildParsedRow(headers, cols);
                if (IsValidParsedRow(row)) result.Add(row);
            }

            return result;
        }

        public static List<ParsedInterviewRow> ReadXlsxParsed(string filePath)
        {
            var result = new List<ParsedInterviewRow>();

            using var fs = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
            using var wb = new XLWorkbook(fs);
            var ws = wb.Worksheets.FirstOrDefault(w =>
                         w.Name.Contains("Interview", StringComparison.OrdinalIgnoreCase) &&
                         w.Name.Contains("data", StringComparison.OrdinalIgnoreCase))
                     ?? wb.Worksheets.FirstOrDefault(w =>
                         w.Name.Contains("Interview", StringComparison.OrdinalIgnoreCase))
                     ?? wb.Worksheets.First();
            var rows = ws.RowsUsed().ToList();
            if (rows.Count == 0) return result;

            List<string> headers = null;
            int headerIndex = -1;
            int columnCount = 8;

            for (int i = 0; i < rows.Count; i++)
            {
                var cells = ReadRowCells(rows[i], MaxColumns);
                if (IsInterviewHeaderRow(cells))
                {
                    headerIndex = i;
                    headers = cells.Select(NormalizeHeader).ToList();
                    columnCount = Math.Max(headers.Count, cells.FindLastIndex(x => !string.IsNullOrWhiteSpace(x)) + 1);
                    columnCount = Math.Min(columnCount, MaxColumns);
                    break;
                }
            }

            if (headers == null || headers.Count == 0)
            {
                headers = Enumerable.Range(1, 8).Select(n => $"Column{n}").ToList();
                headerIndex = 0;
                columnCount = 8;
            }

            int dataStart = headerIndex >= 0 ? headerIndex + 1 : 1;

            for (int i = dataStart; i < rows.Count; i++)
            {
                var row = rows[i];
                if (row.IsEmpty()) continue;

                var cells = ReadRowCells(row, columnCount);
                var parsed = BuildParsedRow(headers, cells);
                if (IsValidParsedRow(parsed)) result.Add(parsed);
            }

            return result;
        }

        private static List<string> ReadRowCells(IXLRow row, int columnCount)
        {
            var cells = new List<string>();
            for (int c = 1; c <= columnCount; c++)
                cells.Add(ReadCellAsString(row.Cell(c), c));
            return cells;
        }

        private static ParsedInterviewRow BuildParsedRow(List<string> headers, IList<string> cells)
        {
            var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            for (int i = 0; i < headers.Count; i++)
            {
                var header = headers[i];
                if (string.IsNullOrWhiteSpace(header)) continue;
                var value = i < cells.Count ? cells[i]?.Trim() : null;
                if (string.IsNullOrEmpty(value)) value = null;
                dict[header] = value;
            }

            return new ParsedInterviewRow { Headers = headers.Where(h => !string.IsNullOrWhiteSpace(h)).ToList(), ByHeader = dict };
        }

        private static string NormalizeHeader(string h)
        {
            if (string.IsNullOrWhiteSpace(h)) return null;
            return h.Trim().TrimEnd(':');
        }

        private static bool IsValidParsedRow(ParsedInterviewRow row)
        {
            var interviewee = GetCanonicalValue(row, "IntervieweeName");
            if (string.IsNullOrWhiteSpace(interviewee)) return false;
            if (interviewee.IndexOf("INTERVIEWEE", StringComparison.OrdinalIgnoreCase) >= 0 ||
                interviewee.IndexOf("CANDIDATE", StringComparison.OrdinalIgnoreCase) >= 0) return false;
            return true;
        }

        public static Interview MapParsedRow(ParsedInterviewRow parsed)
        {
            var now = DateTime.UtcNow;
            if (parsed?.ByHeader == null || parsed.ByHeader.Count == 0)
                return MapRowToInterview(Array.Empty<string>());

            var interviewType = GetCanonicalValue(parsed, "InterviewType");
            var statusRaw = GetCanonicalValue(parsed, "Status") ?? interviewType;
            var jobStart = ParseExcelDate(GetCanonicalValue(parsed, "JobStartDate"));
            var jobClose = ParseExcelDate(GetCanonicalValue(parsed, "JobCloseDate"));
            var interviewDate = ParseExcelDate(GetCanonicalValue(parsed, "InterviewDateTime")) ?? jobStart;

            var interview = new Interview
            {
                InvTo = GetCanonicalValue(parsed, "InvTo"),
                Sr = int.TryParse(GetCanonicalValue(parsed, "Sr"), out int sr) ? sr : null,
                JobHunterName = GetCanonicalValue(parsed, "JobHunterName"),
                InterviewFor = GetCanonicalValue(parsed, "InterviewFor"),
                IntervieweeName = NormalizePersonName(GetCanonicalValue(parsed, "IntervieweeName")),
                CompanyName = GetCanonicalValue(parsed, "CompanyName"),
                InterviewType = string.IsNullOrWhiteSpace(interviewType) ? "Technical" : interviewType,
                Status = InterviewCodeHelper.NormalizeStatus(statusRaw, interviewType),
                InterviewDate = interviewDate,
                JobStartDate = jobStart,
                JobCloseDate = jobClose,
                FirstSalary = GetCanonicalValue(parsed, "FirstSalary"),
                JhSuggest = GetCanonicalValue(parsed, "JhSuggest"),
                InterviewCharges = ParseDecimal(GetCanonicalValue(parsed, "InterviewCharges")),
                JhDue = ParseDecimal(GetCanonicalValue(parsed, "JhDue")),
                FirstPaymentOnJob = ParseDecimal(GetCanonicalValue(parsed, "FirstPaymentOnJob")),
                SecondPaymentOnJob = ParseDecimal(GetCanonicalValue(parsed, "SecondPaymentOnJob")),
                BalancePayable = ParseDecimal(GetCanonicalValue(parsed, "BalancePayable")),
                Stack = DetectStack(parsed),
                CreatedAt = now,
                UpdatedAt = now,
                RawRowJson = JsonSerializer.Serialize(parsed.ByHeader)
            };

            if (string.IsNullOrWhiteSpace(interview.IntervieweeName))
            {
                var fallback = MapRowToInterview(parsed.ToColumnArray());
                interview.IntervieweeName = fallback.IntervieweeName;
                interview.InvTo ??= fallback.InvTo;
                interview.JobHunterName ??= fallback.JobHunterName;
                interview.InterviewFor ??= fallback.InterviewFor;
                interview.CompanyName ??= fallback.CompanyName;
                interview.JobStartDate ??= fallback.JobStartDate;
                interview.JobCloseDate ??= fallback.JobCloseDate;
                interview.InterviewDate ??= fallback.InterviewDate;
            }

            return interview;
        }

        public static Interview MapRowToInterview(string[] cols)
        {
            var now = DateTime.UtcNow;

            if (cols.Length > 10)
            {
                return MapLongFormatRow(cols, now);
            }

            var jobStart = cols.Length > 6 ? ParseExcelDate(cols[6]) : null;
            var jobClose = cols.Length > 7 ? ParseExcelDate(cols[7]) : null;
            var interviewType = cols.Length > 8 ? GetCol(cols, 8) : null;

            var statusRaw = cols.Length > 9 ? GetCol(cols, 9) : interviewType;
            return new Interview
            {
                InvTo = GetCol(cols, 0),
                Sr = int.TryParse(GetCol(cols, 1), out int sr) ? sr : null,
                JobHunterName = GetCol(cols, 2),
                InterviewFor = GetCol(cols, 3),
                IntervieweeName = NormalizePersonName(GetCol(cols, 4)),
                CompanyName = GetCol(cols, 5),
                JobStartDate = jobStart,
                JobCloseDate = jobClose,
                InterviewDate = jobStart,
                InterviewType = string.IsNullOrWhiteSpace(interviewType) ? "Technical" : interviewType,
                Status = InterviewCodeHelper.NormalizeStatus(statusRaw, interviewType),
                Stack = DetectStackFromText(GetCol(cols, 3)),
                InterviewCharges = 0,
                JhDue = 0,
                FirstPaymentOnJob = 0,
                SecondPaymentOnJob = 0,
                BalancePayable = 0,
                CreatedAt = now,
                UpdatedAt = now
            };
        }

        public static Interview MapRowToInterview(ParsedInterviewRow parsed) => MapParsedRow(parsed);

        private static Interview MapLongFormatRow(string[] cols, DateTime now) =>
            new Interview
            {
                Sr = int.TryParse(GetCol(cols, 0), out int srLong) ? srLong : null,
                InvTo = GetCol(cols, 1),
                InterviewDate = cols.Length > 2 ? ParseExcelDate(cols[2]) : null,
                InterviewFor = GetCol(cols, 3),
                IntervieweeName = NormalizePersonName(GetCol(cols, 4)),
                JobHunterName = GetCol(cols, 5),
                CompanyName = GetCol(cols, 6),
                InterviewType = GetCol(cols, 7),
                Status = InterviewCodeHelper.NormalizeStatus(GetCol(cols, 7)),
                JobStartDate = cols.Length > 8 ? ParseExcelDate(cols[8]) : null,
                JobCloseDate = cols.Length > 9 ? ParseExcelDate(cols[9]) : null,
                FirstSalary = cols.Length > 10 ? GetCol(cols, 10) : null,
                JhSuggest = cols.Length > 11 ? GetCol(cols, 11) : null,
                InterviewCharges = cols.Length > 12 ? ParseDecimal(cols[12]) : 0,
                JhDue = cols.Length > 13 ? ParseDecimal(cols[13]) : 0,
                FirstPaymentOnJob = cols.Length > 14 ? ParseDecimal(cols[14]) : 0,
                SecondPaymentOnJob = cols.Length > 15 ? ParseDecimal(cols[15]) : 0,
                BalancePayable = cols.Length > 16 ? ParseDecimal(cols[16]) : 0,
                Stack = DetectStackFromText(GetCol(cols, 3)),
                CreatedAt = now,
                UpdatedAt = now
            };

        private static string DetectStack(ParsedInterviewRow parsed)
        {
            var stackFromExcel = GetCanonicalValue(parsed, "StackName");
            if (!string.IsNullOrWhiteSpace(stackFromExcel))
                return stackFromExcel.Trim();

            var interviewFor = GetCanonicalValue(parsed, "InterviewFor") ?? "";
            var detected = DetectStackFromText(interviewFor);
            if (detected != null) return detected;

            var candidateName = GetCanonicalValue(parsed, "IntervieweeName") ?? "";
            return DetectStackFromText(candidateName);
        }

        private static string DetectStackFromText(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return null;
            var lower = text.ToLowerInvariant();
            if (lower.Contains("ai/ml") || lower.Contains("ai ml") || lower.Contains("machine learning") || lower.Contains("artificial intelligence"))
                return "AI/ML";
            if (lower.Contains("snow") || lower.Contains("snowflake"))
                return "Snow";
            if (lower.Contains("devops") || lower.Contains("dev ops") || lower.Contains("dev-ops"))
                return "DevOps";
            if (lower.Contains("data sc") || lower.Contains("data science") || lower.Contains("data scientist"))
                return "Data Sc.";
            if (lower.Contains("data") && !lower.Contains("data entry"))
                return "Data";
            return null;
        }

        private static string GetCol(string[] cols, int index) =>
            index < cols.Length ? cols[index]?.Trim() : null;

        private static string[] ParseCsvLine(string line)
        {
            char delimiter = line.Contains('|') ? '|' : ',';
            var result = new List<string>();
            var sb = new System.Text.StringBuilder();
            bool inQuotes = false;
            for (int i = 0; i < line.Length; i++)
            {
                char c = line[i];
                if (c == '"') inQuotes = !inQuotes;
                else if (c == delimiter && !inQuotes)
                {
                    result.Add(sb.ToString().Trim());
                    sb.Clear();
                }
                else sb.Append(c);
            }
            result.Add(sb.ToString().Trim());
            return result.ToArray();
        }

        private static string ReadCellAsString(IXLCell cell, int columnIndex)
        {
            try
            {
                if (cell.DataType == XLDataType.DateTime)
                {
                    var dt = cell.GetDateTime();
                    return dt.ToString("dd-MMM-yyyy");
                }

                if (cell.DataType == XLDataType.Number)
                {
                    if (columnIndex >= 7)
                    {
                        var d = cell.GetDouble();
                        if (d > 30000 && d < 60000)
                            return d.ToString("0");
                    }
                    return cell.GetFormattedString()?.Trim() ?? cell.GetDouble().ToString();
                }

                return cell.GetString()?.Trim() ?? string.Empty;
            }
            catch
            {
                return string.Empty;
            }
        }

        public static DateTime? ParseExcelDate(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;
            if (value.Equals("(blank)", StringComparison.OrdinalIgnoreCase)) return null;
            if (double.TryParse(value, out double serial))
            {
                try { return DateTime.FromOADate(serial); }
                catch { return null; }
            }
            var formats = new[]
            {
                "dd-MMM-yyyy", "d-MMM-yyyy", "dd-MMM-yy", "d-MMM-yy",
                "dd MMM yyyy", "d MMM yyyy", "dd MMM yy", "d MMM yy",
                "d-MMM-yy", "dd-MMM-yy",
                "MM/dd/yyyy hh:mm tt", "M/d/yyyy hh:mm tt",
                "MM/dd/yyyy HH:mm", "M/d/yyyy H:mm",
                "yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd",
                "MM/dd/yyyy", "M/d/yyyy",
            };
            if (DateTime.TryParseExact(value, formats, System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None, out DateTime exact))
                return exact;
            if (DateTime.TryParse(value, System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None, out DateTime dt))
                return dt;
            return null;
        }

        public static decimal ParseDecimal(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return 0;
            value = value.Replace(",", "").Replace("\"", "").Replace("$", "");
            if (decimal.TryParse(value, out decimal result)) return result;
            return 0;
        }

        private static string[] ReadAllLinesAllowingShare(string filePath)
        {
            using var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
            using var reader = new StreamReader(stream);
            var lines = new List<string>();
            string line;
            while ((line = reader.ReadLine()) != null)
                lines.Add(line);
            return lines.ToArray();
        }
    }
}
