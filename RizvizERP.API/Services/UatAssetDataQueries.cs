using System;
using System.Collections.Generic;
using System.Linq;
using System.Data.Common;
using Microsoft.EntityFrameworkCore;
using RizvizERP.API.Data;
using RizvizERP.API.DTOs;

namespace RizvizERP.API.Services
{
    /// <summary>
    /// Reads assets from Accounting_System_UAT inventory.assets via dbo.Rizviz_Assets_Live.
    /// </summary>
    internal static class UatAssetDataQueries
    {
        private const string BaseSql = @"
SELECT
    CAST(a.Asset_code AS int) AS Id,
    CAST(
        COALESCE(
            NULLIF(RTRIM(a.AssetTag), ''),
            NULLIF(RTRIM(a.shortcode), ''),
            CONCAT('AST-', CAST(a.Asset_code AS nvarchar(20)))
        ) AS nvarchar(50)
    ) AS AssetCode,
    CAST(
        COALESCE(
            NULLIF(RTRIM(a.AssetName), ''),
            NULLIF(RTRIM(a.AssetDescription), ''),
            CONCAT('Asset ', CAST(a.Asset_code AS nvarchar(20)))
        ) AS nvarchar(200)
    ) AS Name,
    CAST(
        COALESCE(
            NULLIF(RTRIM(g.group_long_name), ''),
            NULLIF(RTRIM(g.group_short_name), ''),
            NULLIF(RTRIM(a.AssetType), ''),
            'General'
        ) AS nvarchar(100)
    ) AS Category,
    CAST(ISNULL(NULLIF(RTRIM(a.SerialNumber), ''), '—') AS nvarchar(100)) AS SerialNumber,
    CAST(COALESCE(a.PurchaseDate, a.insert_time, GETDATE()) AS datetime2) AS PurchaseDate,
    CAST(ISNULL(a.PurchasePrice, 0) AS decimal(18,2)) AS Value,
    CAST(
        CASE
            WHEN EXISTS (SELECT 1 FROM inventory.AssetMaintenance m WHERE m.Asset_code = a.Asset_code)
                OR RTRIM(ISNULL(a.isUnderAMC, '')) IN ('Y', '1', 'T')
                OR (a.NextMaintenanceDue IS NOT NULL AND a.NextMaintenanceDue <= DATEADD(day, 14, GETDATE()))
            THEN 'Maintenance'
            WHEN a.entity_code IS NOT NULL
                 AND (a.ReturnDate IS NULL OR a.ReturnDate > GETDATE())
            THEN 'Assigned'
            WHEN RTRIM(ISNULL(a.IsActive, '')) IN ('N', '0')
            THEN 'Maintenance'
            ELSE 'Available'
        END AS nvarchar(50)
    ) AS Status,
    CAST(ISNULL(a.Remarks, '') AS nvarchar(500)) AS Remarks,
    CAST(
        COALESCE(
            NULLIF(RTRIM(ent.full_name), ''),
            NULLIF(RTRIM(ent.first_name), ''),
            NULLIF(RTRIM(CAST(a.entity_code AS nvarchar(50))), '')
        ) AS nvarchar(200)
    ) AS AssignedToEmployeeName
FROM inventory.assets a
LEFT JOIN inventory_setups.groups g ON a.group_code = g.group_code
LEFT JOIN hrms.entity ent ON a.entity_code = ent.entity_code
WHERE RTRIM(ISNULL(a.is_an_asset, 'Y')) IN ('Y', '1', 'T', '')";

        public static List<AssetDto> GetAllAssets(ApplicationDbContext context, string category = null, string status = null)
        {
            var list = Query(context, BaseSql + " ORDER BY a.Asset_code", null, MapRow);

            if (!string.IsNullOrWhiteSpace(category))
            {
                list = list
                    .Where(a => string.Equals(a.Category, category.Trim(), StringComparison.OrdinalIgnoreCase))
                    .ToList();
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                list = list
                    .Where(a => string.Equals(a.Status, status.Trim(), StringComparison.OrdinalIgnoreCase))
                    .ToList();
            }

            return list;
        }

        private static AssetDto MapRow(DbDataReader r) => new AssetDto
        {
            Id = r.GetInt32(0),
            AssetCode = r.IsDBNull(1) ? null : r.GetString(1),
            Name = r.IsDBNull(2) ? null : r.GetString(2),
            Category = r.IsDBNull(3) ? null : r.GetString(3),
            SerialNumber = r.IsDBNull(4) ? null : r.GetString(4),
            PurchaseDate = r.IsDBNull(5) ? DateTime.MinValue : r.GetDateTime(5),
            Value = r.IsDBNull(6) ? 0 : r.GetDecimal(6),
            Status = r.IsDBNull(7) ? "Available" : r.GetString(7),
            Remarks = r.IsDBNull(8) ? null : r.GetString(8),
            AssignedToEmployeeName = r.IsDBNull(9) ? null : r.GetString(9)
        };

        private static List<T> Query<T>(ApplicationDbContext context, string sql, Action<DbCommand> bind, Func<DbDataReader, T> map)
        {
            var list = new List<T>();
            var conn = context.Database.GetDbConnection();
            var wasOpen = conn.State == System.Data.ConnectionState.Open;
            if (!wasOpen) conn.Open();
            try
            {
                using var cmd = conn.CreateCommand();
                cmd.CommandText = sql;
                bind?.Invoke(cmd);
                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                    list.Add(map(reader));
            }
            finally
            {
                if (!wasOpen) conn.Close();
            }
            return list;
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
