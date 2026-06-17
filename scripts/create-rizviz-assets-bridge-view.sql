/*
  RUN IN SSMS on Accounting_System_UAT (or sqlcmd)
  Maps inventory.assets (+ employee assignment) to Rizviz ERP Asset Register.
*/

USE Accounting_System_UAT;
GO

IF OBJECT_ID('dbo.Rizviz_Assets_Live', 'V') IS NOT NULL
    DROP VIEW dbo.Rizviz_Assets_Live;
GO

CREATE VIEW dbo.Rizviz_Assets_Live AS
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
    CAST(ISNULL(a.Remarks, '') AS nvarchar(500)) AS Remarks
FROM inventory.assets a
LEFT JOIN inventory_setups.groups g ON a.group_code = g.group_code
WHERE RTRIM(ISNULL(a.is_an_asset, 'Y')) IN ('Y', '1', 'T', '');
GO

PRINT 'Rizviz_Assets_Live view created.';
GO
