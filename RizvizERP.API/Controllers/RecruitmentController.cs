using System;
using Microsoft.AspNetCore.Mvc;
using RizvizERP.API.Models;
using RizvizERP.API.Services;

namespace RizvizERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RecruitmentController : ControllerBase
    {
        private readonly IRecruitmentService _recruitmentService;
        private readonly IAuthService _authService;

        public RecruitmentController(IRecruitmentService recruitmentService, IAuthService authService)
        {
            _recruitmentService = recruitmentService;
            _authService = authService;
        }



        [HttpGet("candidates")]
        public IActionResult GetCandidates([FromQuery] int? jobId = null)
        {
            try
            {
                var candidates = _recruitmentService.GetCandidates(jobId);
                return Ok(candidates);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPut("candidates/{candidateId}/status")]
        public IActionResult UpdateCandidateStatus(int candidateId, [FromBody] StatusUpdateModel model)
        {
            try
            {
                var cand = _recruitmentService.UpdateCandidateStatus(candidateId, model.Status);
                if (cand == null) return NotFound(new { message = "Candidate not found." });

                _authService.LogAction("user", $"Updated Candidate ID {candidateId} status to {model.Status}", "Recruitment", HttpContext.Connection.RemoteIpAddress?.ToString());
                return Ok(cand);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("jobs")]
        public IActionResult GetJobs()
        {
            try
            {
                var jobs = _recruitmentService.GetJobs();
                return Ok(jobs);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("jobs")]
        public IActionResult CreateJob([FromBody] JobPosting job)
        {
            try
            {
                var created = _recruitmentService.CreateJob(job);
                _authService.LogAction("user", $"Created Job Posting {created.Title}", "Recruitment", HttpContext.Connection.RemoteIpAddress?.ToString());
                return Ok(created);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }

    public class FeedbackUpdateModel
    {
        public string Feedback { get; set; }
        public string Rating { get; set; }
    }

    public class StatusUpdateModel
    {
        public string Status { get; set; }
    }
}
