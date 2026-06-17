using System;
using Microsoft.AspNetCore.Mvc;
using RizvizERP.API.DTOs;
using RizvizERP.API.Services;

namespace RizvizERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PayrollController : ControllerBase
    {
        private readonly IPayrollService _payrollService;
        private readonly IAuthService _authService;

        public PayrollController(IPayrollService payrollService, IAuthService authService)
        {
            _payrollService = payrollService;
            _authService = authService;
        }

        [HttpGet("monthly/{year}/{month}")]
        public IActionResult GetMonthlyPayroll(int year, int month)
        {
            try
            {
                var payroll = _payrollService.GetMonthlyPayroll(year, month);
                return Ok(payroll);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("process")]
        public IActionResult ProcessPayroll([FromBody] PayrollProcessRequest request)
        {
            try
            {
                var result = _payrollService.ProcessPayroll(request);
                _authService.LogAction(request.ProcessedBy ?? "user", $"Processed Payroll for {request.Year}-{request.Month:D2}", "Payroll", HttpContext.Connection.RemoteIpAddress?.ToString());
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("payslip/{employeeId}/{month}/{year}")]
        public IActionResult GetPayslip(int employeeId, int month, int year)
        {
            try
            {
                var payslip = _payrollService.GetPayslip(employeeId, month, year);
                if (payslip == null) return NotFound(new { message = "Payslip not found." });
                return Ok(payslip);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }
}
