using System;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using RizvizERP.API.Services;

namespace RizvizERP.API.Controllers
{
    /// <summary>
    /// FileKey Controller — exposes the daily file-key system.
    /// Date is always sourced from DateTime.Now on the server.
    /// </summary>
    [ApiController]
    [Route("api/filekey")]
    public class FileKeyController : ControllerBase
    {
        private readonly FileKeyService _fileKeyService;

        public FileKeyController(FileKeyService fileKeyService)
        {
            _fileKeyService = fileKeyService;
        }

        // ── GET /api/filekey/today ─────────────────────────────────────────

        /// <summary>
        /// Returns today's file key record.
        /// Creates it if it doesn't exist yet.
        /// Returns 400 on weekends with a Urdu/English message.
        /// </summary>
        [HttpGet("today")]
        public IActionResult GetToday()
        {
            var today = DateTime.Now;

            if (FileKeyService.IsWeekend(today))
            {
                return BadRequest(new
                {
                    isWeekend = true,
                    message   = "Weekend hai — aaj file generate nahi hogi",
                    date      = today.Date.ToString("yyyy-MM-dd"),
                    dayName   = FileKeyService.GetDayName(today.DayOfWeek)
                });
            }

            try
            {
                var record = _fileKeyService.GetOrCreateToday();

                return Ok(new
                {
                    fileKey    = record.FileKey,
                    date       = record.FileDate.ToString("yyyy-MM-dd"),
                    dayName    = FileKeyService.GetDayName(today.DayOfWeek),
                    weekNumber = record.WeekNumber,
                    month      = record.Month,
                    year       = record.Year,
                    isWeekend  = false,
                    dayCode    = record.DayCode,
                    createdAt  = record.CreatedAt,
                    isLocked   = record.IsLocked
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    isWeekend = true,
                    message   = ex.Message
                });
            }
        }

        // ── GET /api/filekey/all ────────────────────────────────────────────

        /// <summary>
        /// Returns all generated file keys in the current in-memory session.
        /// Ordered by newest first.
        /// </summary>
        [HttpGet("all")]
        public IActionResult GetAll()
        {
            var keys = _fileKeyService.GetAllKeys()
                .OrderByDescending(k => k.FileDate)
                .Select(k => new
                {
                    fileKey    = k.FileKey,
                    date       = k.FileDate.ToString("yyyy-MM-dd"),
                    dayName    = FileKeyService.GetDayName(k.FileDate.DayOfWeek),
                    weekNumber = k.WeekNumber,
                    month      = k.Month,
                    year       = k.Year,
                    dayCode    = k.DayCode,
                    createdAt  = k.CreatedAt,
                    isLocked   = k.IsLocked,
                    excelPath  = k.ExcelPath
                })
                .ToList();

            return Ok(new { total = keys.Count, keys });
        }
    }

}
