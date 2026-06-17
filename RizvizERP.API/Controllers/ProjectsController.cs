using System;
using Microsoft.AspNetCore.Mvc;
using RizvizERP.API.Data;
using RizvizERP.API.DTOs;
using RizvizERP.API.Models;
using RizvizERP.API.Services;

namespace RizvizERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProjectsController : ControllerBase
    {
        private readonly IProjectService _projectService;
        private readonly IAuthService _authService;

        public ProjectsController(IProjectService projectService, IAuthService authService)
        {
            _projectService = projectService;
            _authService = authService;
        }

        [HttpGet("stats")]
        public IActionResult GetStats()
        {
            try
            {
                return Ok(_projectService.GetProjectStats());
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet]
        public IActionResult GetProjects([FromQuery] string metric = null, [FromQuery] string search = null)
        {
            try
            {
                var projects = _projectService.GetAllProjects(metric, search);
                return Ok(projects);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost]
        public IActionResult CreateProject([FromBody] Project project)
        {
            try
            {
                var created = _projectService.CreateProject(project);
                _authService.LogAction("user", $"Created Project {created.ProjectCode}", "Projects", HttpContext.Connection.RemoteIpAddress?.ToString());
                return Ok(created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("{projectId}/assign-member")]
        public IActionResult AssignMember(int projectId, [FromBody] ProjectMemberDto memberDto)
        {
            try
            {
                var success = _projectService.AssignMember(projectId, memberDto);
                if (!success)
                    return BadRequest(new { message = UatSchemaConfiguration.IsEnabled && UatSchemaConfiguration.UseLiveProjectsView
                        ? "Projects are read-only from UAT. Assign resources in the source system."
                        : "Failed to assign project member. Project or Employee not found." });

                _authService.LogAction("user", $"Assigned Employee ID {memberDto.EmployeeId} to Project ID {projectId}", "Projects", HttpContext.Connection.RemoteIpAddress?.ToString());
                return Ok(new { message = "Member assigned successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }
}
