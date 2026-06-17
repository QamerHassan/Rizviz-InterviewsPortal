using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using RizvizERP.API.Data;
using RizvizERP.API.Models;

namespace RizvizERP.API.Services
{
    /// <summary>
    /// Reads HR child data from native UAT tables (hrms.*) using entity_code / EmpCode.
    /// </summary>
    internal static class UatDataQueries
    {
        public static string GetEmpCode(ApplicationDbContext context, int viewEmployeeId)
        {
            return context.Employees.AsNoTracking()
                .Where(e => e.Id == viewEmployeeId)
                .Select(e => e.EmpCode)
                .FirstOrDefault();
        }

        public static List<SalaryHistory> GetSalaryHistory(ApplicationDbContext context, int viewEmployeeId, string empCode)
        {
            if (string.IsNullOrWhiteSpace(empCode)) return new List<SalaryHistory>();

            const string sql = @"
SELECT
    CAST(ROW_NUMBER() OVER (ORDER BY s.Effective_Date, s.Increment_code) AS int) AS Id,
    @viewId AS EmployeeId,
    s.Effective_Date AS EffectiveDate,
    CAST(ISNULL(s.Increment_Amount, 0) AS decimal(18,2)) AS BasicSalary,
    CAST(0 AS decimal(18,2)) AS OnJobSalary,
    CAST(ISNULL(CAST(s.currency AS nvarchar(20)), '') AS nvarchar(50)) AS Currency,
    CAST(ISNULL(s.month_year, '') AS nvarchar(200)) AS Reason
FROM hrms.Emp_Salary_Increments s
WHERE CAST(s.Entity_code AS nvarchar(50)) = @empCode
   OR (TRY_CAST(@empCode AS numeric(18,0)) IS NOT NULL AND s.Entity_code = TRY_CAST(@empCode AS numeric(18,0)))";

            return Query(context, sql, cmd =>
            {
                AddParam(cmd, "@viewId", viewEmployeeId);
                AddParam(cmd, "@empCode", empCode.Trim());
            }, r => new SalaryHistory
            {
                Id = r.GetInt32(0),
                EmployeeId = r.GetInt32(1),
                EffectiveDate = r.IsDBNull(2) ? (DateTime?)null : r.GetDateTime(2),
                BasicSalary = r.GetDecimal(3),
                OnJobSalary = r.GetDecimal(4),
                Currency = r.IsDBNull(5) ? null : r.GetString(5),
                Reason = r.IsDBNull(6) ? null : r.GetString(6)
            });
        }

        public static List<Document> GetDocuments(ApplicationDbContext context, int viewEmployeeId, string empCode)
        {
            if (string.IsNullOrWhiteSpace(empCode)) return new List<Document>();

            const string sql = @"
SELECT
    CAST(ROW_NUMBER() OVER (ORDER BY d.emp_doc_code) AS int) AS Id,
    @viewId AS EmployeeId,
    CAST(ISNULL(d.shortcode, 'HR') AS nvarchar(100)) AS DocumentType,
    CAST(ISNULL(d.doc_name, '') AS nvarchar(200)) AS DocumentName,
    CAST('' AS nvarchar(500)) AS FilePath,
    d.insert_time AS UploadedAt
FROM hrms.emp_docsfor_hr d
WHERE CAST(d.entity_code AS nvarchar(50)) = @empCode
   OR (TRY_CAST(@empCode AS numeric(18,0)) IS NOT NULL AND d.entity_code = TRY_CAST(@empCode AS numeric(18,0)))";

            return Query(context, sql, cmd =>
            {
                AddParam(cmd, "@viewId", viewEmployeeId);
                AddParam(cmd, "@empCode", empCode.Trim());
            }, r => new Document
            {
                Id = r.GetInt32(0),
                EmployeeId = r.GetInt32(1),
                DocumentType = r.IsDBNull(2) ? null : r.GetString(2),
                DocumentName = r.IsDBNull(3) ? null : r.GetString(3),
                FilePath = r.IsDBNull(4) ? null : r.GetString(4),
                UploadedAt = r.IsDBNull(5) ? (DateTime?)null : r.GetDateTime(5)
            });
        }

        public static BankInfo GetBankInfo(ApplicationDbContext context, int viewEmployeeId, string empCode)
        {
            if (string.IsNullOrWhiteSpace(empCode)) return null;

            const string sql = @"
SELECT TOP 1
    CAST(1 AS int) AS Id,
    @viewId AS EmployeeId,
    CAST(ISNULL(CAST(b.emp_bank_code AS nvarchar(50)), '') AS nvarchar(100)) AS BankName,
    CAST(ISNULL(b.account_nbr, '') AS nvarchar(100)) AS AccountNumber,
    CAST(ISNULL(b.IBAN_nbr, '') AS nvarchar(100)) AS IBAN,
    CAST(ISNULL(CAST(b.emp_bankbrcode AS nvarchar(50)), '') AS nvarchar(50)) AS BranchCode
FROM hrms.emp_banks b
WHERE (CAST(b.entity_code AS nvarchar(50)) = @empCode
    OR (TRY_CAST(@empCode AS numeric(18,0)) IS NOT NULL AND b.entity_code = TRY_CAST(@empCode AS numeric(18,0))))
ORDER BY CASE WHEN ISNULL(b.is_mainAcct, 0) = 1 THEN 0 ELSE 1 END, b.emp_bank_code";

            var rows = Query(context, sql, cmd =>
            {
                AddParam(cmd, "@viewId", viewEmployeeId);
                AddParam(cmd, "@empCode", empCode.Trim());
            }, r => new BankInfo
            {
                Id = r.GetInt32(0),
                EmployeeId = r.GetInt32(1),
                BankName = r.IsDBNull(2) ? null : r.GetString(2),
                AccountNumber = r.IsDBNull(3) ? null : r.GetString(3),
                IBAN = r.IsDBNull(4) ? null : r.GetString(4),
                BranchCode = r.IsDBNull(5) ? null : r.GetString(5)
            });

            return rows.Count > 0 ? rows[0] : null;
        }

        private static List<T> Query<T>(ApplicationDbContext context, string sql, Action<DbCommand> bind, Func<DbDataReader, T> map)
        {
            var results = new List<T>();
            var conn = context.Database.GetDbConnection();
            var wasOpen = conn.State == System.Data.ConnectionState.Open;
            if (!wasOpen) conn.Open();
            try
            {
                using var cmd = conn.CreateCommand();
                cmd.CommandText = sql;
                bind(cmd);
                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                    results.Add(map(reader));
            }
            finally
            {
                if (!wasOpen) conn.Close();
            }
            return results;
        }

        private static void AddParam(DbCommand cmd, string name, object value)
        {
            var p = cmd.CreateParameter();
            p.ParameterName = name;
            p.Value = value ?? DBNull.Value;
            cmd.Parameters.Add(p);
        }
    }
}
