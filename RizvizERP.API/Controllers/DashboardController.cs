using System;
using Microsoft.AspNetCore.Mvc;
using RizvizERP.API.Services;

namespace RizvizERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DashboardController : ControllerBase
    {
        private readonly IDashboardService _dashboardService;

        public DashboardController(IDashboardService dashboardService)
        {
            _dashboardService = dashboardService;
        }

        [HttpGet("hr-stats")]
        public IActionResult GetHRStats()
        {
            try
            {
                var stats = _dashboardService.GetStats();
                return Ok(stats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("payroll-stats")]
        public IActionResult GetPayrollStats()
        {
            try
            {
                var stats = _dashboardService.GetStats();
                return Ok(stats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }
}
