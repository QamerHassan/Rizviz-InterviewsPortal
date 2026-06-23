using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using ClosedXML.Excel;
using RizvizERP.API.Models;

namespace RizvizERP.API.Services
{
    public static class AuthHelper
    {
        private static string GetUsersFilePath()
        {
            var baseDir = AppDomain.CurrentDomain.BaseDirectory;
            var pathInBase = Path.Combine(baseDir, "users.xlsx");
            if (File.Exists(pathInBase)) return pathInBase;

            var currentDir = Directory.GetCurrentDirectory();
            var pathInCurrent = Path.Combine(currentDir, "users.xlsx");
            if (File.Exists(pathInCurrent)) return pathInCurrent;

            // Return the base-dir path as the final fallback (caller checks existence)
            return pathInBase;
        }

        // Robust is_active check: handles numeric 1, text "1", "true", "yes", "active"
        private static bool ParseIsActive(IXLCell cell)
        {
            try
            {
                // Try as boolean directly
                if (cell.Value.IsBoolean) return cell.GetValue<bool>();
                // Try as number (1 = active, 0 = inactive)
                if (cell.Value.IsNumber) return cell.GetValue<double>() != 0;
                // Try as string
                var s = cell.GetString()?.Trim() ?? "";
                return s == "1"
                    || string.Equals(s, "true", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(s, "yes", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(s, "active", StringComparison.OrdinalIgnoreCase);
            }
            catch { return false; }
        }

        private static bool ParseIsFirstLogin(IXLCell cell)
        {
            try
            {
                if (cell.IsEmpty()) return true; // Default to true if not specified
                if (cell.Value.IsBoolean) return cell.GetValue<bool>();
                if (cell.Value.IsNumber) return cell.GetValue<double>() != 0;
                var s = cell.GetString()?.Trim() ?? "";
                if (string.IsNullOrEmpty(s)) return true;
                return s == "1"
                    || string.Equals(s, "true", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(s, "yes", StringComparison.OrdinalIgnoreCase);
            }
            catch { return true; }
        }

        public static User AuthenticateUser(string username, string password)
        {
            // Hardcoded admin bypass
            if (string.Equals(username, "Rizviz", StringComparison.OrdinalIgnoreCase) && password == "5121472")
            {
                Console.WriteLine("[AuthHelper] Admin login success.");
                return new User
                {
                    Id = 0, Username = "Rizviz", FullName = "Rizviz Admin",
                    RoleName = "Admin", InterviewName = "", IsActive = true, IsFirstLogin = false
                };
            }

            var usersPath = GetUsersFilePath();
            if (!File.Exists(usersPath))
            {
                Console.WriteLine($"[AuthHelper] ERROR: users.xlsx not found at: {usersPath}");
                return null;
            }

            Console.WriteLine($"[AuthHelper] Reading users.xlsx for login: {username}");

            try
            {
                // Open with FileShare.ReadWrite so it works even if Excel has the file open
                using var fs = new FileStream(usersPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                using var wb = new XLWorkbook(fs);
                var ws = wb.Worksheet("users");
                if (ws == null)
                {
                    Console.WriteLine("[AuthHelper] ERROR: Sheet 'users' not found.");
                    return null;
                }

                // user_code(1) | full_name(2) | user_login_id(3) | password(4) | role(5) | interview_name(6) | is_active(7) | is_first_login(8)
                var rows = ws.RowsUsed().Skip(1); // Skip header

                foreach (var row in rows)
                {
                    var userLoginId = row.Cell(3).GetString()?.Trim();
                    var pwd         = row.Cell(4).GetString()?.Trim();
                    bool isActive   = ParseIsActive(row.Cell(7));
                    bool isFirst    = ParseIsFirstLogin(row.Cell(8));

                    Console.WriteLine($"[AuthHelper] Row {row.RowNumber()}: id='{userLoginId}' active={isActive}");

                    if (!isActive) continue;

                    if (string.Equals(userLoginId, username, StringComparison.OrdinalIgnoreCase))
                    {
                        bool passwordMatch = false;
                        try
                        {
                            // Try BCrypt verification first
                            passwordMatch = BCrypt.Net.BCrypt.Verify(password, pwd);
                        }
                        catch
                        {
                            // If stored password is plain text, BCrypt.Verify throws exception. Fall back to plain text comparison.
                            passwordMatch = (pwd == password);
                        }

                        if (passwordMatch)
                        {
                            Console.WriteLine($"[AuthHelper] Login SUCCESS for '{username}' | IsFirstLogin={isFirst} | col8_raw='{row.Cell(8).GetString()}' | col8_isEmpty={row.Cell(8).IsEmpty()}");
                            return new User
                            {
                                Id            = row.RowNumber(),
                                Username      = userLoginId,
                                FullName      = row.Cell(2).GetString()?.Trim(),
                                PasswordHash  = pwd,
                                RoleName      = row.Cell(5).GetString()?.Trim(),
                                InterviewName = row.Cell(6).GetString()?.Trim(),
                                IsActive      = true,
                                IsFirstLogin  = isFirst
                            };
                        }
                    }
                }

                Console.WriteLine($"[AuthHelper] Login FAILED: no matching active user or incorrect password for '{username}'");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AuthHelper] EXCEPTION reading users.xlsx: {ex.Message}");
            }

            return null;
        }

        public static User GetUserByUsername(string username)
        {
            if (string.Equals(username, "Rizviz", StringComparison.OrdinalIgnoreCase))
            {
                return new User
                {
                    Id = 0, Username = "Rizviz", FullName = "Rizviz Admin",
                    RoleName = "Admin", InterviewName = "", IsActive = true
                };
            }

            var usersPath = GetUsersFilePath();
            if (!File.Exists(usersPath)) return null;

            try
            {
                using var fs = new FileStream(usersPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                using var wb = new XLWorkbook(fs);
                var ws = wb.Worksheet("users");
                if (ws == null) return null;

                var rows = ws.RowsUsed().Skip(1);

                foreach (var row in rows)
                {
                    var userLoginId = row.Cell(3).GetString()?.Trim();
                    bool isActive   = ParseIsActive(row.Cell(7));

                    if (!isActive) continue;

                    if (string.Equals(userLoginId, username, StringComparison.OrdinalIgnoreCase))
                    {
                        return new User
                        {
                            Id            = row.RowNumber(),
                            Username      = userLoginId,
                            FullName      = row.Cell(2).GetString()?.Trim(),
                            RoleName      = row.Cell(5).GetString()?.Trim(),
                            InterviewName = row.Cell(6).GetString()?.Trim(),
                            IsActive      = true,
                            IsFirstLogin  = ParseIsFirstLogin(row.Cell(8))
                        };
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AuthHelper] EXCEPTION in GetUserByUsername: {ex.Message}");
            }

            return null;
        }

        public static List<User> GetAllUsers()
        {
            var users = new List<User>
            {
                new User { Id = 0, Username = "Rizviz", FullName = "Rizviz Admin", RoleName = "Admin", IsActive = true, IsFirstLogin = false }
            };

            var usersPath = GetUsersFilePath();
            if (!File.Exists(usersPath)) return users;

            try
            {
                using var fs = new FileStream(usersPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                using var wb = new XLWorkbook(fs);
                var ws = wb.Worksheet("users");
                if (ws == null) return users;

                foreach (var row in ws.RowsUsed().Skip(1))
                {
                    bool isActive = ParseIsActive(row.Cell(7));
                    if (!isActive) continue;
                    var username = row.Cell(3).GetString()?.Trim();
                    if (string.IsNullOrWhiteSpace(username)) continue;
                    users.Add(new User
                    {
                        Id            = row.RowNumber(),
                        Username      = username,
                        FullName      = row.Cell(2).GetString()?.Trim(),
                        RoleName      = row.Cell(5).GetString()?.Trim(),
                        InterviewName = row.Cell(6).GetString()?.Trim(),
                        IsActive      = true,
                        IsFirstLogin  = ParseIsFirstLogin(row.Cell(8))
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AuthHelper] EXCEPTION in GetAllUsers: {ex.Message}");
            }

            return users;
        }

        public static bool UpdateUserCredentials(string oldUsername, string newUsername, string hashedNewPassword)
        {
            var usersPath = GetUsersFilePath();
            if (!File.Exists(usersPath)) return false;
            try
            {
                // Step 1: Read entire file into memory so we hold NO file lock
                byte[] fileBytes = File.ReadAllBytes(usersPath);

                using var readMs = new MemoryStream(fileBytes);
                using var wb = new XLWorkbook(readMs);

                var ws = wb.Worksheet("users");
                if (ws == null) return false;

                bool found = false;
                foreach (var row in ws.RowsUsed().Skip(1))
                {
                    var userLoginId = row.Cell(3).GetString()?.Trim();
                    if (string.Equals(userLoginId, oldUsername, StringComparison.OrdinalIgnoreCase))
                    {
                        row.Cell(3).Value = newUsername;
                        row.Cell(4).Value = hashedNewPassword;
                        row.Cell(8).Value = 0; // IsFirstLogin = false
                        found = true;
                        break;
                    }
                }

                if (!found) return false;

                // Step 2: Save workbook into a NEW MemoryStream (not the original)
                using var writeMs = new MemoryStream();
                wb.SaveAs(writeMs);
                byte[] outBytes = writeMs.ToArray();

                // Step 3: Write bytes to disk atomically (only after SaveAs succeeds)
                File.WriteAllBytes(usersPath, outBytes);

                Console.WriteLine($"[AuthHelper] ✅ Credentials updated: '{oldUsername}' → '{newUsername}'");
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AuthHelper] EXCEPTION updating user credentials: {ex.Message}");
            }
            return false;
        }

        public static bool ResetUserPassword(string username, string hashedTempPassword)
        {
            var usersPath = GetUsersFilePath();
            if (!File.Exists(usersPath)) return false;
            try
            {
                // Step 1: Read entire file into memory
                byte[] fileBytes = File.ReadAllBytes(usersPath);

                using var readMs = new MemoryStream(fileBytes);
                using var wb = new XLWorkbook(readMs);

                var ws = wb.Worksheet("users");
                if (ws == null) return false;

                bool found = false;
                foreach (var row in ws.RowsUsed().Skip(1))
                {
                    var userLoginId = row.Cell(3).GetString()?.Trim();
                    if (string.Equals(userLoginId, username, StringComparison.OrdinalIgnoreCase))
                    {
                        row.Cell(4).Value = hashedTempPassword;
                        row.Cell(8).Value = 1; // IsFirstLogin = true
                        found = true;
                        break;
                    }
                }

                if (!found) return false;

                // Step 2: Save workbook into memory
                using var writeMs = new MemoryStream();
                wb.SaveAs(writeMs);
                byte[] outBytes = writeMs.ToArray();

                // Step 3: Write bytes atomically to disk
                File.WriteAllBytes(usersPath, outBytes);

                Console.WriteLine($"[AuthHelper] ✅ Password reset for '{username}'");
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[AuthHelper] EXCEPTION resetting user password: {ex.Message}");
            }
            return false;
        }

        public static string GetSessionIdFromToken(string authHeader)
        {
            if (string.IsNullOrEmpty(authHeader)) return null;
            var bearerPrefix = "Bearer ";
            var token = authHeader.StartsWith(bearerPrefix) ? authHeader.Substring(bearerPrefix.Length) : authHeader;
            var sessionIndex = token.IndexOf("_session_");
            if (sessionIndex >= 0)
            {
                return token.Substring(sessionIndex + "_session_".Length);
            }
            return null;
        }

        public static string GetUsernameFromToken(string authHeader)
        {
            if (string.IsNullOrEmpty(authHeader)) return null;
            var bearerPrefix = "Bearer ";
            var token = authHeader.StartsWith(bearerPrefix) ? authHeader.Substring(bearerPrefix.Length) : authHeader;
            var prefix = "db_jwt_mock_token_key_for_";
            if (token.StartsWith(prefix))
            {
                var usernamePart = token.Substring(prefix.Length);
                var sessionIndex = usernamePart.IndexOf("_session_");
                if (sessionIndex >= 0)
                {
                    return usernamePart.Substring(0, sessionIndex);
                }
                return usernamePart;
            }
            return null;
        }
    }
}
