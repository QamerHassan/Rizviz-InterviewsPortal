using System;
using Microsoft.AspNetCore.Mvc;
using RizvizERP.API.DTOs;
using RizvizERP.API.Services;

namespace RizvizERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EmployeeController : ControllerBase
    {
        private readonly IEmployeeService _employeeService;
        private readonly IAuthService _authService;

        public EmployeeController(IEmployeeService employeeService, IAuthService authService)
        {
            _employeeService = employeeService;
            _authService = authService;
        }

        [HttpGet("stats")]
        public IActionResult GetStats()
        {
            try
            {
                return Ok(_employeeService.GetEmployeeStats());
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet]
        public IActionResult GetAll([FromQuery] string search = null, [FromQuery] string branchCode = null, [FromQuery] string status = null, [FromQuery] string statusGroup = null)
        {
            try
            {
                var list = _employeeService.GetAll(search, branchCode, status, statusGroup);
                return Ok(list);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public IActionResult GetById(int id)
        {
            try
            {
                var emp = _employeeService.GetById(id);
                if (emp == null) return NotFound(new { message = $"Employee with ID {id} not found." });
                return Ok(emp);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost]
        public IActionResult Create([FromBody] EmployeeDetailDto dto)
        {
            try
            {
                if (!ModelState.IsValid) return BadRequest(ModelState);
                var created = _employeeService.Create(dto);
                _authService.LogAction("user", $"Created Employee {created.EmpCode}", "HR", HttpContext.Connection.RemoteIpAddress?.ToString());
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public IActionResult Update(int id, [FromBody] EmployeeDetailDto dto)
        {
            try
            {
                if (!ModelState.IsValid) return BadRequest(ModelState);
                var updated = _employeeService.Update(id, dto);
                if (updated == null) return NotFound(new { message = $"Employee with ID {id} not found." });
                
                _authService.LogAction("user", $"Updated Employee {updated.EmpCode}", "HR", HttpContext.Connection.RemoteIpAddress?.ToString());
                return Ok(updated);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public IActionResult Delete(int id)
        {
            try
            {
                var success = _employeeService.Delete(id);
                if (!success) return NotFound(new { message = $"Employee with ID {id} not found." });
                
                _authService.LogAction("user", $"Deleted Employee ID {id}", "HR", HttpContext.Connection.RemoteIpAddress?.ToString());
                return Ok(new { message = "Employee deleted successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("{id}/salary-history")]
        public IActionResult GetSalaryHistory(int id)
        {
            try
            {
                var history = _employeeService.GetSalaryHistory(id);
                return Ok(history);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("{id}/documents")]
        public IActionResult GetDocuments(int id)
        {
            try
            {
                var docs = _employeeService.GetDocuments(id);
                return Ok(docs);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("{id}/documents")]
        public IActionResult UploadDocument(int id, [FromForm] string docType, [FromForm] string fileName)
        {
            try
            {
                // In mock mode, we simulate file upload and return a mock path
                var doc = _employeeService.SaveDocument(id, docType, fileName, $"/uploads/emp_{id}/{fileName}");
                if (doc == null) return BadRequest(new { message = "Failed to save document. Employee not found." });
                return Ok(doc);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }
}
