using System;
using Microsoft.AspNetCore.Mvc;
using RizvizERP.API.Services;

namespace RizvizERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReportsController : ControllerBase
    {
        private readonly IEmployeeService _employeeService;
        private readonly IPayrollService _payrollService;
        private readonly IInventoryService _inventoryService;

        public ReportsController(IEmployeeService employeeService, IPayrollService payrollService, IInventoryService inventoryService)
        {
            _employeeService = employeeService;
            _payrollService = payrollService;
            _inventoryService = inventoryService;
        }

        [HttpGet("employees")]
        public IActionResult GetEmployeeReport([FromQuery] string branchCode = null, [FromQuery] string status = null)
        {
            try
            {
                var data = _employeeService.GetAll(null, branchCode, status);
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("payroll")]
        public IActionResult GetPayrollReport([FromQuery] int year, [FromQuery] int month)
        {
            try
            {
                if (year == 0) year = DateTime.Today.Year;
                if (month == 0) month = DateTime.Today.Month;

                var data = _payrollService.GetMonthlyPayroll(year, month);
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("assets")]
        public IActionResult GetAssetReport([FromQuery] string category = null, [FromQuery] string status = null)
        {
            try
            {
                var data = _inventoryService.GetAllAssets(category, status);
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }
}
