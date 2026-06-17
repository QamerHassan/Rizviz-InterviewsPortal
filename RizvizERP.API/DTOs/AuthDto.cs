using System;

namespace RizvizERP.API.DTOs
{
    public class LoginRequest
    {
        public string? CompanyCode { get; set; }
        public string? BranchCode { get; set; }
        public string Username { get; set; }
        public string Password { get; set; }
    }

    public class LoginResponse
    {
        public string Token { get; set; }
        public string RefreshToken { get; set; }
        public int UserId { get; set; }
        public string Username { get; set; }
        public string FullName { get; set; }
        public string Role { get; set; }
        public string InterviewName { get; set; }
        public string CompanyCode { get; set; }
        public string BranchCode { get; set; }
        public bool IsFirstLogin { get; set; }
        public DateTime Expiry { get; set; }
    }

    public class TokenRefreshRequest
    {
        public string Token { get; set; }
        public string RefreshToken { get; set; }
    }

    public class CompleteSetupRequest
    {
        public string OldUsername { get; set; }
        public string NewUsername { get; set; }
        public string NewPassword { get; set; }
    }

    public class ResetPasswordRequest
    {
        public string Username { get; set; }
        public string TempPassword { get; set; }
    }
}
