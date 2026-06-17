/*
  RUN IN SSMS on Accounting_System_UAT (or use sqlcmd)
  Maps your real UAT tables to the shape the Rizviz ERP API expects.
*/

USE Accounting_System_UAT;
GO

IF OBJECT_ID('dbo.Rizviz_Companies', 'V') IS NOT NULL DROP VIEW dbo.Rizviz_Companies;
GO
CREATE VIEW dbo.Rizviz_Companies AS
SELECT
    CAST(ROW_NUMBER() OVER (ORDER BY c.company_code) AS int) AS Id,
    CAST(c.company_code AS nvarchar(50)) AS CompanyCode,
    CAST(c.company_name AS nvarchar(200)) AS Name,
    CAST(ISNULL(c.ntn_no, '') AS nvarchar(100)) AS TaxId,
    CAST(ISNULL(c.address_1, '') AS nvarchar(500)) AS Address,
    CAST(ISNULL(c.phone_1, '') AS nvarchar(50)) AS Phone,
    CAST(CASE WHEN ISNULL(c.curr_sts, 'A') IN ('A', '1', 'Active', 'Y') THEN 1 ELSE 0 END AS bit) AS IsActive
FROM dbo.Company c;
GO

IF OBJECT_ID('dbo.Rizviz_Branches', 'V') IS NOT NULL DROP VIEW dbo.Rizviz_Branches;
GO
CREATE VIEW dbo.Rizviz_Branches AS
SELECT
    CAST(ROW_NUMBER() OVER (ORDER BY b.company_code, b.branch_code) AS int) AS Id,
    CAST(b.branch_code AS nvarchar(50)) AS BranchCode,
    CAST(b.branch_name AS nvarchar(200)) AS Name,
    CAST(b.company_code AS nvarchar(50)) AS CompanyCode,
    CAST('' AS nvarchar(100)) AS City,
    CAST(ISNULL(b.address, '') AS nvarchar(500)) AS Address,
    CAST(CASE WHEN ISNULL(b.is_default, 0) = 1 OR ISNULL(b.is_head_office, 0) = 1 THEN 1 ELSE 1 END AS bit) AS IsActive
FROM dbo.Company_branches b;
GO

IF OBJECT_ID('dbo.Rizviz_Employees', 'V') IS NOT NULL DROP VIEW dbo.Rizviz_Employees;
GO
CREATE VIEW dbo.Rizviz_Employees AS
SELECT
    CAST(ROW_NUMBER() OVER (ORDER BY e.company_code, e.entity_code) AS int) AS Id,
    CAST(CAST(e.entity_code AS nvarchar(50)) AS nvarchar(50)) AS EmpCode,
    CAST(CAST(e.company_code AS nvarchar(50)) AS nvarchar(50)) AS CompanyCode,
    CAST(CAST(e.branch_code AS nvarchar(50)) AS nvarchar(50)) AS BranchCode,
    CAST(ISNULL(NULLIF(RTRIM(e.full_name), ''), ISNULL(RTRIM(e.first_name), CAST(CAST(e.entity_code AS nvarchar(50)) AS nvarchar(100)))) AS nvarchar(100)) AS FirstName,
    CAST(ISNULL(e.middle_name, '') AS nvarchar(100)) AS MiddleName,
    CAST(ISNULL(e.last_name, '') AS nvarchar(100)) AS LastName,
    CAST(ISNULL(e.father_name, '') AS nvarchar(100)) AS FatherName,
    CAST(ISNULL(jt.JobTitle, ISNULL(ft.FunctionalTitle, ISNULL(g.grades_dsc, CAST(ISNULL(e.EmpJOBTitle_Code, e.EmpFunctTitle_Code) AS nvarchar(50))))) AS nvarchar(50)) AS Grade,
    CAST(ISNULL(e.emp_type, CAST(ISNULL(e.EmpTypes_Code, 0) AS nvarchar(50))) AS nvarchar(50)) AS Type,
    CAST(ISNULL(es.StatusName, CASE WHEN e.EmpStatus_Code IS NULL THEN 'Active' ELSE CAST(e.EmpStatus_Code AS nvarchar(50)) END) AS nvarchar(50)) AS Status,
    CAST(ISNULL(e.cnic_no, '') AS nvarchar(20)) AS CNIC,
    CAST(ISNULL(e.sex, '') AS nvarchar(20)) AS Gender,
    e.dob AS DateOfBirth,
    e.join_date AS JoiningDate,
    e.job_offer_date AS JobOfferDate,
    e.final_intvw_date AS FinalInterviewDate,
    e.leaving_date AS LeavingDate,
    e.termination_date AS TerminationDate,
    e.anniversary_date AS AnniversaryDate,
    CAST(ISNULL(e.marital_status, '') AS nvarchar(50)) AS MaritalStatus,
    CAST(ISNULL(e.ntn_no, '') AS nvarchar(50)) AS NTN,
    CAST(ISNULL(e.nationality, '') AS nvarchar(50)) AS Nationality,
    CAST(ISNULL(e.religion, '') AS nvarchar(50)) AS Religion,
    CAST(ISNULL(e.individual_company, '') AS nvarchar(50)) AS IndividualOrCompany,
    e.cnic_valid_upto AS CNICValidity,
    CAST(ISNULL(e.passport_no, '') AS nvarchar(50)) AS PassportNo,
    e.ppt_valid_upto AS PassportValidity,
    CAST(ISNULL(e.licence_no, '') AS nvarchar(50)) AS LicenceNo,
    e.lic_valid_upto AS LicenceValidity,
    CAST(ISNULL(e.referred_by, '') AS nvarchar(100)) AS ReferredBy,
    CAST(ISNULL(e.remarks, '') AS nvarchar(500)) AS Remarks,
    CAST(CASE WHEN RTRIM(ISNULL(e.is_Non_IT, '')) IN ('1', 'Y', 'y', 'T', 't') THEN 'Non-IT' ELSE 'IT' END AS nvarchar(20)) AS ItOrNonIt,
    CAST(CASE WHEN RTRIM(ISNULL(e.is_outsourced, '')) IN ('1', 'Y', 'y', 'T', 't') THEN 1 ELSE 0 END AS bit) AS Outsourced,
    CAST(CASE WHEN RTRIM(ISNULL(e.is_experienced, '')) IN ('1', 'Y', 'y', 'T', 't') THEN 1 ELSE 0 END AS bit) AS Experienced,
    CAST(CASE WHEN RTRIM(ISNULL(e.has_certifications, '')) IN ('1', 'Y', 'y', 'T', 't') THEN 1 ELSE 0 END AS bit) AS Certifications,
    CAST(CASE WHEN RTRIM(ISNULL(e.has_multiple_roles, '')) IN ('1', 'Y', 'y', 'T', 't') THEN 1 ELSE 0 END AS bit) AS MultipleRoles,
    CAST(CASE WHEN RTRIM(ISNULL(e.external_emp, '')) IN ('1', 'Y', 'y', 'T', 't') THEN 1 ELSE 0 END AS bit) AS [External],
    CAST(CASE WHEN RTRIM(ISNULL(e.is_remote, '')) IN ('1', 'Y', 'y', 'T', 't') THEN 1 ELSE 0 END AS bit) AS Remote,
    CAST(ISNULL(e.gross_Salary, 0) AS decimal(18,2)) AS BasicSalary,
    CAST(ISNULL(e.On_Job_Salary, 0) AS decimal(18,2)) AS OnJobSalary,
    CAST(ISNULL(CAST(e.ccy AS nvarchar(10)), '') AS nvarchar(10)) AS Currency,
    CAST(ISNULL(CAST(e.job_ccy AS nvarchar(10)), '') AS nvarchar(10)) AS OnJobCurrency,
    CAST(ISNULL(e.Invoice_too, '') AS nvarchar(100)) AS InvoiceTo,
    CAST(RTRIM(ISNULL(e.payment_mode, '')) AS nvarchar(50)) AS PayMode,
    CAST(ISNULL(CAST(e.payment_ccy AS nvarchar(10)), '') AS nvarchar(10)) AS PaymentCurrency,
    CAST('' AS nvarchar(max)) AS TermsAndConditions
FROM hrms.entity e
LEFT JOIN hrms_setups.EmployeeStatuses es ON e.EmpStatus_Code = es.EmpStatus_Code
LEFT JOIN hrms_setups.EmployeeJobTitles jt ON e.EmpJOBTitle_Code = jt.EmpJOBTitle_Code
LEFT JOIN hrms_setups.EmployeeFunctionalTitles ft ON e.EmpFunctTitle_Code = ft.EmpFunctTitle_Code
LEFT JOIN hrms_setups.grades g ON e.grade_code = g.grade_code;
GO

PRINT 'Bridge views created successfully.';
GO
