using System;
using Microsoft.AspNetCore.Mvc;
using RizvizERP.API.Services;

namespace RizvizERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SetupController : ControllerBase
    {
        private readonly ISetupService _setupService;

        public SetupController(ISetupService setupService)
        {
            _setupService = setupService;
        }

        [HttpGet("companies")]
        public IActionResult GetCompanies()
        {
            try
            {
                var companies = _setupService.GetCompanies();
                return Ok(companies);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("branches")]
        public IActionResult GetBranches([FromQuery] string companyCode = null)
        {
            try
            {
                var branches = _setupService.GetBranches(companyCode);
                return Ok(branches);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("dropdowns")]
        public IActionResult GetDropdowns([FromQuery] string category = null)
        {
            try
            {
                var dropdowns = _setupService.GetDropdowns(category);
                return Ok(dropdowns);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }
}
