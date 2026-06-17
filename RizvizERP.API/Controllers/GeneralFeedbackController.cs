using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using RizvizERP.API.DTOs;
using RizvizERP.API.Models;
using RizvizERP.API.Repositories;
using RizvizERP.API.Services;

namespace RizvizERP.API.Controllers
{
    [ApiController]
    [Route("api/general-feedback")]
    public class GeneralFeedbackController : ControllerBase
    {
        private readonly IGeneralFeedbackRepository _repo;
        private readonly IGoogleSheetsService _sheets;
        private readonly ILogger<GeneralFeedbackController> _logger;

        public GeneralFeedbackController(
            IGeneralFeedbackRepository repo,
            IGoogleSheetsService sheets,
            ILogger<GeneralFeedbackController> logger)
        {
            _repo   = repo;
            _sheets = sheets;
            _logger = logger;
        }

        // ── POST /api/general-feedback ────────────────────────────────────────
        /// <summary>Submit a new feedback entry. Saves to DB, then syncs to Google Sheets.</summary>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateFeedbackRequestDto dto)
        {
            // 1. Model validation (DataAnnotations handled by [ApiController] automatically,
            //    but we validate explicitly so we can return a clean response shape)
            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid feedback submission: {@Errors}", ModelState);
                return BadRequest(new { success = false, errors = ModelState });
            }

            // 2. Save to database
            GeneralFeedback saved;
            try
            {
                var entity = new GeneralFeedback
                {
                    Name      = dto.Name.Trim(),
                    Email     = dto.Email.Trim().ToLowerInvariant(),
                    Message   = dto.Message.Trim(),
                    Timestamp = DateTime.UtcNow
                };

                saved = await _repo.AddAsync(entity);
                _logger.LogInformation("Feedback #{Id} saved to DB for {Email}", saved.Id, saved.Email);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to save feedback to database");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Failed to save feedback. Please try again later."
                });
            }

            // 3. Sync to Google Sheets (non-fatal — DB success is sufficient)
            var (sheetOk, sheetError) = await _sheets.AppendFeedbackAsync(saved);
            string sheetMessage;

            if (sheetOk)
            {
                await _repo.MarkSheetSyncedAsync(saved.Id);
                sheetMessage = "Synced to Google Sheets.";
            }
            else
            {
                sheetMessage = $"Saved to DB, but sheet sync skipped: {sheetError}";
                _logger.LogWarning("Sheet sync failed for Feedback #{Id}: {Error}", saved.Id, sheetError);
            }

            // 4. Return response — partial success if sheet failed
            var response = new FeedbackResponseDto
            {
                Id           = saved.Id,
                Name         = saved.Name,
                Email        = saved.Email,
                Message      = saved.Message,
                Timestamp    = saved.Timestamp,
                SheetSynced  = sheetOk,
                Status       = sheetOk ? "success" : "partial",
                SheetMessage = sheetMessage
            };

            return sheetOk
                ? Ok(response)
                : StatusCode(207, response);   // 207 Multi-Status = partial success
        }

        // ── GET /api/general-feedback ─────────────────────────────────────────
        /// <summary>List all feedback entries (admin use).</summary>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var all = await _repo.GetAllAsync();
                return Ok(all);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch feedback list");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ── GET /api/general-feedback/{id} ───────────────────────────────────
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var fb = await _repo.GetByIdAsync(id);
            if (fb == null) return NotFound(new { success = false, message = $"Feedback #{id} not found." });
            return Ok(fb);
        }
    }
}
