/*
  RUN IN SSMS on Accounting_System_UAT
  Excel sync storage + interview change history.
*/

USE Accounting_System_UAT;
GO

-- Extend Rizviz_Interviews (do not drop existing data)
IF COL_LENGTH('dbo.Rizviz_Interviews', 'interview_code') IS NULL
    ALTER TABLE dbo.Rizviz_Interviews ADD interview_code nvarchar(100) NULL;
GO
IF COL_LENGTH('dbo.Rizviz_Interviews', 'status') IS NULL
    ALTER TABLE dbo.Rizviz_Interviews ADD status nvarchar(50) NOT NULL DEFAULT 'Scheduled';
GO
IF COL_LENGTH('dbo.Rizviz_Interviews', 'last_synced_at') IS NULL
    ALTER TABLE dbo.Rizviz_Interviews ADD last_synced_at datetime2 NULL;
GO

SET QUOTED_IDENTIFIER ON;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_Rizviz_Interviews_interview_code' AND object_id = OBJECT_ID('dbo.Rizviz_Interviews'))
BEGIN
    CREATE UNIQUE INDEX UX_Rizviz_Interviews_interview_code
        ON dbo.Rizviz_Interviews(interview_code)
        WHERE interview_code IS NOT NULL;
END
GO

IF OBJECT_ID('dbo.Rizviz_InterviewHistory', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Rizviz_InterviewHistory (
        id int IDENTITY(1,1) PRIMARY KEY,
        interview_id int NOT NULL,
        interview_code nvarchar(100) NULL,
        old_status nvarchar(50) NULL,
        new_status nvarchar(50) NULL,
        old_recruiter nvarchar(255) NULL,
        new_recruiter nvarchar(255) NULL,
        old_interview_date date NULL,
        new_interview_date date NULL,
        changed_by nvarchar(100) NOT NULL DEFAULT 'ExcelSync',
        changed_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
        change_summary nvarchar(500) NULL
    );
    CREATE INDEX IX_Rizviz_InterviewHistory_interview_id ON dbo.Rizviz_InterviewHistory(interview_id);
END
GO

IF OBJECT_ID('dbo.Rizviz_InterviewSyncLog', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Rizviz_InterviewSyncLog (
        id int IDENTITY(1,1) PRIMARY KEY,
        synced_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
        source_path nvarchar(500) NULL,
        total_rows int NOT NULL DEFAULT 0,
        inserted_rows int NOT NULL DEFAULT 0,
        updated_rows int NOT NULL DEFAULT 0,
        unchanged_rows int NOT NULL DEFAULT 0,
        failed_rows int NOT NULL DEFAULT 0,
        error_message nvarchar(max) NULL
    );
END
GO

PRINT 'Interview sync tables ready.';
GO
