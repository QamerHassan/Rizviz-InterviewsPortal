USE Accounting_System_UAT;
GO

IF COL_LENGTH('dbo.Rizviz_Interviews', 'raw_row_json') IS NULL
    ALTER TABLE dbo.Rizviz_Interviews ADD raw_row_json nvarchar(max) NULL;
GO

PRINT 'raw_row_json column ready on Rizviz_Interviews.';
GO
