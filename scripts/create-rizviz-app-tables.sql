/*
  RUN IN SSMS on Accounting_System_UAT
  Creates ERP-only tables (login, interviews, dropdowns).
*/

USE Accounting_System_UAT;
GO

IF OBJECT_ID('dbo.Rizviz_Users', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Rizviz_Users (
        Id int IDENTITY(1,1) PRIMARY KEY,
        Username nvarchar(100) NOT NULL,
        PasswordHash nvarchar(200) NOT NULL,
        FullName nvarchar(200) NULL,
        Email nvarchar(200) NULL,
        RoleName nvarchar(50) NULL,
        CompanyCode nvarchar(50) NULL,
        BranchCode nvarchar(50) NULL,
        IsActive bit NOT NULL DEFAULT 1
    );
    INSERT INTO dbo.Rizviz_Users (Username, PasswordHash, FullName, Email, RoleName, CompanyCode, BranchCode, IsActive)
    VALUES
        ('admin', 'admin123', 'Admin User', 'admin@rizviz.com', 'Admin', '1', '1', 1),
        ('hr', 'hr123', 'HR Manager', 'hr@rizviz.com', 'HR', '1', '1', 1);
END
ELSE
BEGIN
    UPDATE dbo.Rizviz_Users SET CompanyCode = '1', BranchCode = '1' WHERE Username IN ('admin', 'hr');
END
GO

IF OBJECT_ID('dbo.Rizviz_DropdownValues', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Rizviz_DropdownValues (
        Id int IDENTITY(1,1) PRIMARY KEY,
        Category nvarchar(100) NOT NULL,
        [Key] nvarchar(100) NOT NULL,
        Value nvarchar(200) NOT NULL,
        DisplayOrder int NOT NULL DEFAULT 0
    );
END
GO

-- Interviews table must match Interview.cs column names (snake_case)
IF OBJECT_ID('dbo.Rizviz_Interviews', 'U') IS NOT NULL
    DROP TABLE dbo.Rizviz_Interviews;
GO

CREATE TABLE dbo.Rizviz_Interviews (
    id int IDENTITY(1,1) PRIMARY KEY,
    sr int NULL,
    inv_to nvarchar(100) NULL,
    interview_date date NULL,
    interview_for nvarchar(255) NULL,
    interviewee_name nvarchar(255) NULL,
    job_hunter_name nvarchar(255) NULL,
    company_name nvarchar(255) NULL,
    interview_type nvarchar(100) NULL,
    job_start_date date NULL,
    job_close_date date NULL,
    first_salary nvarchar(50) NULL,
    jh_suggest nvarchar(255) NULL,
    interview_charges decimal(12,2) NOT NULL DEFAULT 0,
    jh_due decimal(12,2) NOT NULL DEFAULT 0,
    first_payment_on_job decimal(12,2) NOT NULL DEFAULT 0,
    second_payment_on_job decimal(12,2) NOT NULL DEFAULT 0,
    balance_payable decimal(12,2) NOT NULL DEFAULT 0,
    created_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

PRINT 'Rizviz app tables ready.';
GO
