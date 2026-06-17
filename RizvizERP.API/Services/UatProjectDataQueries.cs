using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using RizvizERP.API.Data;
using RizvizERP.API.DTOs;

namespace RizvizERP.API.Services
{
    internal static class UatProjectDataQueries
    {
        public static Dictionary<int, List<ProjectMemberDto>> GetMembersByProjectCode(ApplicationDbContext context)
        {
            const string sql = @"
SELECT
    CAST(ps.project_code AS int) AS ProjectCode,
    CAST(ISNULL(re.Id, 0) AS int) AS EmployeeId,
    CAST(
        COALESCE(
            NULLIF(RTRIM(ent.full_name), ''),
            NULLIF(RTRIM(ent.first_name), ''),
            CONCAT('Entity ', CAST(ps.entity_code AS nvarchar(20)))
        ) AS nvarchar(200)
    ) AS EmployeeName,
    CAST(
        COALESCE(
            NULLIF(RTRIM(CAST(ps.job_type AS nvarchar(50))), ''),
            NULLIF(RTRIM(CAST(ps.EmpRole_Code AS nvarchar(50))), ''),
            'Team Member'
        ) AS nvarchar(100)
    ) AS RoleInProject,
    CAST(
        CASE RTRIM(ISNULL(ps.Partial_Full_ind, ''))
            WHEN 'F' THEN 100
            WHEN 'P' THEN 50
            ELSE 100
        END AS float
    ) AS AllocationPercentage
FROM mkt.project_stakeholders ps
LEFT JOIN hrms.entity ent ON ps.entity_code = ent.entity_code
LEFT JOIN dbo.Rizviz_Employees re ON TRY_CAST(re.EmpCode AS numeric(18,0)) = ps.entity_code
    OR RTRIM(re.EmpCode) = RTRIM(CAST(ps.entity_code AS nvarchar(50)))
WHERE ps.project_code IS NOT NULL
  AND (ps.entity_code IS NOT NULL OR ps.lead_code IS NOT NULL)";

            var map = new Dictionary<int, List<ProjectMemberDto>>();
            var conn = context.Database.GetDbConnection();
            var wasOpen = conn.State == System.Data.ConnectionState.Open;
            if (!wasOpen) conn.Open();
            try
            {
                using var cmd = conn.CreateCommand();
                cmd.CommandText = sql;
                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    var projectCode = reader.GetInt32(0);
                    if (!map.TryGetValue(projectCode, out var list))
                    {
                        list = new List<ProjectMemberDto>();
                        map[projectCode] = list;
                    }
                    list.Add(new ProjectMemberDto
                    {
                        EmployeeId = reader.IsDBNull(1) ? 0 : reader.GetInt32(1),
                        EmployeeName = reader.IsDBNull(2) ? "Unknown" : reader.GetString(2),
                        RoleInProject = reader.IsDBNull(3) ? "Team Member" : reader.GetString(3),
                        AllocationPercentage = reader.IsDBNull(4) ? 100 : reader.GetDouble(4)
                    });
                }
            }
            finally
            {
                if (!wasOpen) conn.Close();
            }
            return map;
        }
    }
}
