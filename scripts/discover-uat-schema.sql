-- Run this in SSMS while connected to Accounting_System_UAT
-- Copy the results and share if the app still shows empty/wrong data

USE Accounting_System_UAT;
GO

SELECT @@SERVERNAME AS ServerName, DB_NAME() AS DatabaseName;

-- Tables your app needs to map (from Object Explorer)
SELECT c.TABLE_SCHEMA, c.TABLE_NAME, c.COLUMN_NAME, c.DATA_TYPE, c.IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS c
WHERE (c.TABLE_SCHEMA = 'dbo' AND c.TABLE_NAME IN ('Company', 'Company_branches'))
   OR (c.TABLE_SCHEMA = 'hrms' AND c.TABLE_NAME IN ('entity', 'emp_addresses', 'emp_banks', 'emp_JOBInformation'))
ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME, c.ORDINAL_POSITION;

-- Sample row counts
SELECT 'dbo.Company' AS Tbl, COUNT(*) AS Cnt FROM dbo.Company;
SELECT 'dbo.Company_branches' AS Tbl, COUNT(*) AS Cnt FROM dbo.Company_branches;
SELECT 'hrms.entity' AS Tbl, COUNT(*) AS Cnt FROM hrms.entity;
