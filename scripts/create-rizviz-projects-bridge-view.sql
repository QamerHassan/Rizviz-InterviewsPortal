/*
  RUN IN SSMS on Accounting_System_UAT
  Maps mkt.Projects to Rizviz ERP project resource management.
*/

USE Accounting_System_UAT;
GO

IF OBJECT_ID('dbo.Rizviz_Projects_Live', 'V') IS NOT NULL
    DROP VIEW dbo.Rizviz_Projects_Live;
GO

CREATE VIEW dbo.Rizviz_Projects_Live AS
SELECT
    CAST(p.project_Code AS int) AS Id,
    CAST(CONCAT('PRJ-', CAST(p.project_Code AS nvarchar(20))) AS nvarchar(50)) AS ProjectCode,
    CAST(ISNULL(NULLIF(RTRIM(p.Proj_name), ''), CONCAT('Project ', CAST(p.project_Code AS nvarchar(20)))) AS nvarchar(200)) AS Name,
    CAST(ISNULL(p.proj_description, '') AS nvarchar(max)) AS Description,
    CAST(COALESCE(p.actual_start_dte, p.proj_opening_dte, p.tentative_start_dte, p.creation_dte, GETDATE()) AS datetime2) AS StartDate,
    CAST(p.proj_close_dte AS datetime2) AS EndDate,
    CAST(
        CASE
            WHEN RTRIM(ISNULL(p.proj_status, '')) IN ('In-Progress', 'I', 'In Progress') THEN 'In Progress'
            WHEN RTRIM(ISNULL(p.proj_status, '')) IN ('Closed', 'C', 'Completed') THEN 'Completed'
            WHEN RTRIM(ISNULL(p.proj_status, '')) IN ('On Hold', 'H') THEN 'On Hold'
            WHEN RTRIM(ISNULL(p.proj_status, '')) = '' THEN 'Planned'
            ELSE RTRIM(p.proj_status)
        END AS nvarchar(50)
    ) AS Status,
    CAST(
        COALESCE(
            NULLIF(RTRIM(p.shortcode), ''),
            NULLIF(RTRIM(c.company_name), ''),
            CONCAT('Company ', CAST(ISNULL(p.company_code, 0) AS nvarchar(20)))
        ) AS nvarchar(200)
    ) AS ClientName,
    CAST(ISNULL(p.self_month_days, 0) AS decimal(18,2)) AS Budget
FROM mkt.Projects p
LEFT JOIN dbo.Company c ON p.company_code = c.company_code;
GO

PRINT 'Rizviz_Projects_Live view created.';
GO
