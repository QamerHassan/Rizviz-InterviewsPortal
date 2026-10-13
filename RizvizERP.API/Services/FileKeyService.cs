using System;
using System.Collections.Generic;
using System.Linq;

namespace RizvizERP.API.Services
{
    // ──────────────────────────────────────────────────────────────────────────
    // FileKeyRecord — maps 1:1 to the future DB table "file_keys"
    // ──────────────────────────────────────────────────────────────────────────
    public class FileKeyRecord
    {
        public string FileKey { get; set; }        // e.g. 2026_M06_M1
        public DateTime FileDate { get; set; }
        public int Year { get; set; }
        public int Month { get; set; }
        public int WeekNumber { get; set; }        // 1-5, resets monthly
        public string DayCode { get; set; }        // M, T, W, TH, F
        public bool IsLocked { get; set; }
        public string GeneratedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public string ExcelPath { get; set; }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // FileKeyService — in-memory store; same pattern as MockServices.cs
    // When DB is ready: swap _fileKeys list for EF DbSet<FileKeyRecord>
    // ──────────────────────────────────────────────────────────────────────────
    public class FileKeyService
    {
        private static readonly List<FileKeyRecord> _fileKeys = new();
        private static readonly object _lock = new object();

        // ── Key generation ────────────────────────────────────────────────────

        /// <summary>
        /// Generates a file key string for the given server date.
        /// Format: {YEAR}_M{MONTH}_{DAY_LETTER}{WEEK_OF_MONTH}
        /// Throws on weekends.
        /// </summary>
        public string GenerateFileKey(DateTime serverDate)
        {
            int year = serverDate.Year;
            string month = serverDate.Month.ToString("D2");
            int weekNumber = GetWeekOfMonth(serverDate);

            var dayLetters = new Dictionary<DayOfWeek, string>
            {
                { DayOfWeek.Monday,    "M"  },
                { DayOfWeek.Tuesday,   "T"  },
                { DayOfWeek.Wednesday, "W"  },
                { DayOfWeek.Thursday,  "TH" },
                { DayOfWeek.Friday,    "F"  }
            };

            if (!dayLetters.ContainsKey(serverDate.DayOfWeek))
                throw new InvalidOperationException("Weekend pe file generate nahi hoti");

            string dayLetter = dayLetters[serverDate.DayOfWeek];
            return $"{year}_M{month}_{dayLetter}{weekNumber}";
        }

        /// <summary>
        /// Week-of-month: week 1 starts on the 1st of the month.
        /// Resets to 1 on every new month.
        /// </summary>
        private int GetWeekOfMonth(DateTime date)
        {
            DateTime firstDay = new DateTime(date.Year, date.Month, 1);
            // Sunday = 7 so Monday starts the week
            int firstDayOfWeek = (int)firstDay.DayOfWeek;
            if (firstDayOfWeek == 0) firstDayOfWeek = 7;
            return (int)Math.Ceiling((date.Day + firstDayOfWeek - 1) / 7.0);
        }

        // ── In-memory CRUD ────────────────────────────────────────────────────

        /// <summary>
        /// Returns the FileKeyRecord for today.
        /// Creates a new one if it doesn't exist yet (idempotent).
        /// Throws InvalidOperationException if today is a weekend.
        /// </summary>
        public FileKeyRecord GetOrCreateToday()
        {
            lock (_lock)
            {
                var today = DateTime.Now;
                string key = GenerateFileKey(today); // throws on weekend

                var existing = _fileKeys.FirstOrDefault(f => f.FileKey == key);
                if (existing != null) return existing;

                var record = new FileKeyRecord
                {
                    FileKey      = key,
                    FileDate     = today.Date,
                    Year         = today.Year,
                    Month        = today.Month,
                    WeekNumber   = GetWeekOfMonth(today),
                    DayCode      = key.Split('_').Last(),
                    CreatedAt    = DateTime.Now,
                    IsLocked     = false
                };

                _fileKeys.Add(record);
                return record;
            }
        }

        /// <summary>
        /// Returns all generated file key records (in-memory list).
        /// </summary>
        public List<FileKeyRecord> GetAllKeys()
        {
            lock (_lock)
            {
                return _fileKeys.ToList();
            }
        }

        /// <summary>
        /// Returns true if today is a weekend (Saturday or Sunday).
        /// </summary>
        public static bool IsWeekend(DateTime date)
        {
            return date.DayOfWeek == DayOfWeek.Saturday ||
                   date.DayOfWeek == DayOfWeek.Sunday;
        }

        /// <summary>
        /// Maps DayOfWeek to a human-readable name string.
        /// </summary>
        public static string GetDayName(DayOfWeek dow) => dow switch
        {
            DayOfWeek.Monday    => "Monday",
            DayOfWeek.Tuesday   => "Tuesday",
            DayOfWeek.Wednesday => "Wednesday",
            DayOfWeek.Thursday  => "Thursday",
            DayOfWeek.Friday    => "Friday",
            DayOfWeek.Saturday  => "Saturday",
            DayOfWeek.Sunday    => "Sunday",
            _                   => dow.ToString()
        };
    }
}
