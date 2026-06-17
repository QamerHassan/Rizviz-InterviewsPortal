using System;
using Microsoft.AspNetCore.Mvc;
using RizvizERP.API.DTOs;
using RizvizERP.API.Models;
using RizvizERP.API.Services;

namespace RizvizERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InventoryController : ControllerBase
    {
        private readonly IInventoryService _inventoryService;
        private readonly IAuthService _authService;

        public InventoryController(IInventoryService inventoryService, IAuthService authService)
        {
            _inventoryService = inventoryService;
            _authService = authService;
        }

        [HttpGet("assets")]
        public IActionResult GetAssets([FromQuery] string category = null, [FromQuery] string status = null)
        {
            try
            {
                var assets = _inventoryService.GetAllAssets(category, status);
                return Ok(assets);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("assets")]
        public IActionResult CreateAsset([FromBody] Asset asset)
        {
            try
            {
                var created = _inventoryService.CreateAsset(asset);
                _authService.LogAction("user", $"Created Asset {created.AssetCode}", "Inventory", HttpContext.Connection.RemoteIpAddress?.ToString());
                return Ok(created);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("assets/assign")]
        public IActionResult AssignAsset([FromBody] AssetAssignmentRequest request)
        {
            try
            {
                var assignment = _inventoryService.AssignAsset(request);
                if (assignment == null) return BadRequest(new { message = "Failed to assign asset. Asset or Employee not found." });

                _authService.LogAction("user", $"Assigned Asset {assignment.AssetCode} to Employee ID {assignment.EmployeeId}", "Inventory", HttpContext.Connection.RemoteIpAddress?.ToString());
                return Ok(assignment);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPut("assets/return/{id}")]
        public IActionResult ReturnAsset(int id, [FromBody] string condition)
        {
            try
            {
                var success = _inventoryService.ReturnAsset(id, condition);
                if (!success) return NotFound(new { message = "Asset assignment not found." });

                _authService.LogAction("user", $"Returned Asset Assignment ID {id}", "Inventory", HttpContext.Connection.RemoteIpAddress?.ToString());
                return Ok(new { message = "Asset returned successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }
}
