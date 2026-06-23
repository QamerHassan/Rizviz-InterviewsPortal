using System;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using RizvizERP.API.DTOs;
using RizvizERP.API.Services;

namespace RizvizERP.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginRequest request)
        {
            try
            {
                var response = _authService.Login(request);
                if (response == null)
                {
                    _authService.LogAction(request.Username ?? "Unknown", "Failed Login Attempt", "Auth", HttpContext.Connection.RemoteIpAddress?.ToString());
                    return Unauthorized(new { message = "Invalid username or password, or user not found." });
                }

                _authService.LogAction(response.Username, "User Login", "Auth", HttpContext.Connection.RemoteIpAddress?.ToString());
                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ── First-Login Setup ──────────────────────────────────────────────────
        [HttpPost("complete-setup")]
        public IActionResult CompleteSetup([FromBody] CompleteSetupRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.OldUsername))
                    return BadRequest(new { message = "OldUsername is required." });
                if (string.IsNullOrWhiteSpace(request.NewUsername) || request.NewUsername.Trim().Length < 3)
                    return BadRequest(new { message = "NewUsername must be at least 3 characters." });
                if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
                    return BadRequest(new { message = "NewPassword must be at least 6 characters." });

                // Verify user exists and IsFirstLogin is still true
                var user = AuthHelper.GetUserByUsername(request.OldUsername);
                if (user == null)
                    return NotFound(new { message = "User not found." });
                if (!user.IsFirstLogin)
                    return BadRequest(new { message = "Account setup has already been completed." });

                // Hash the new password
                var hashed = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, workFactor: 12);

                // Write to Excel
                bool ok = AuthHelper.UpdateUserCredentials(
                    oldUsername: request.OldUsername.Trim(),
                    newUsername: request.NewUsername.Trim(),
                    hashedNewPassword: hashed
                );

                if (!ok)
                    return StatusCode(500, new { message = "Failed to save credentials. Contact admin." });

                _authService.LogAction(request.OldUsername, "Completed First-Login Setup", "Auth",
                    HttpContext.Connection.RemoteIpAddress?.ToString());

                return Ok(new { message = "Account secured. Please log in with your new credentials." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ── Admin: List all users ──────────────────────────────────────────────
        [HttpGet("users")]
        public IActionResult GetUsers()
        {
            try
            {
                var users = AuthHelper.GetAllUsers()
                    .Select(u => new
                    {
                        u.Id,
                        u.Username,
                        u.FullName,
                        u.RoleName,
                        u.InterviewName,
                        u.IsActive,
                        u.IsFirstLogin
                    });
                return Ok(users);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ── Admin: Reset a user's password ────────────────────────────────────
        [HttpPost("reset-password")]
        public IActionResult ResetPassword([FromBody] ResetPasswordRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Username))
                    return BadRequest(new { message = "Username is required." });
                if (string.IsNullOrWhiteSpace(request.TempPassword) || request.TempPassword.Length < 4)
                    return BadRequest(new { message = "Temporary password must be at least 4 characters." });

                // Cannot reset the hardcoded super-admin
                if (string.Equals(request.Username, "Rizviz", StringComparison.OrdinalIgnoreCase))
                    return BadRequest(new { message = "The built-in admin account cannot be reset." });

                var user = AuthHelper.GetUserByUsername(request.Username);
                if (user == null)
                    return NotFound(new { message = "User not found." });

                var hashed = BCrypt.Net.BCrypt.HashPassword(request.TempPassword, workFactor: 12);
                bool ok = AuthHelper.ResetUserPassword(request.Username.Trim(), hashed);

                if (!ok)
                    return StatusCode(500, new { message = "Failed to reset password. Contact system admin." });

                _authService.LogAction(request.Username, "Admin Password Reset", "Auth",
                    HttpContext.Connection.RemoteIpAddress?.ToString());

                return Ok(new { message = $"Password reset for '{request.Username}'. They must complete account setup on next login." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("refresh")]
        public IActionResult Refresh([FromBody] TokenRefreshRequest request)
        {
            try
            {
                var response = _authService.RefreshToken(request);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("logout")]
        public IActionResult Logout()
        {
            try
            {
                var authHeader = Request.Headers["Authorization"].ToString();
                var sessionId = AuthHelper.GetSessionIdFromToken(authHeader);
                if (!string.IsNullOrEmpty(sessionId))
                {
                    SessionExcelManager.ClearState(sessionId);
                    SessionExcelManager.ClearTemp(sessionId);
                }
            }
            catch {}
            return Ok(new { message = "Logged out successfully." });
        }

        [HttpGet("audit-logs")]
        public IActionResult GetAuditLogs()
        {
            try
            {
                var logs = _authService.GetAuditLogs();
                return Ok(logs);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }
}
