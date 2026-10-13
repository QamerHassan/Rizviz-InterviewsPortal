/*
  RUN IN SSMS on AccountingSystem (or Accounting_System_UAT)
  Maps live marketing interview data (mkt.interview_master + mkt.interview_detail)
  to the shape expected by Rizviz ERP Interviews API / calendar.
  Includes a second row per interview when Job_landed_date differs (more calendar coverage).

  Resolves:
  1. BD / Added by: 'Admin' or 'syed musa' -> 'Syed Musa' (or via dbo.Rizviz_Users)
  2. Developer: joined via COALESCE(d.entity_code, m.entity_code) = ent.entity_code
  3. Includes all EF Core model columns (status, stack, location, payscale, etc.)
*/

USE AccountingSystem;
-- If running on UAT instead, uncomment:
-- USE Accounting_System_UAT;
GO

-- Ensure time_Zone column exists on mkt.interview_detail
IF COL_LENGTH('mkt.interview_detail', 'time_Zone') IS NULL
BEGIN
    ALTER TABLE mkt.interview_detail ADD time_Zone varchar(50) NULL;
END
GO

IF OBJECT_ID('dbo.Rizviz_Interviews_Live', 'V') IS NOT NULL
    DROP VIEW dbo.Rizviz_Interviews_Live;
GO

CREATE VIEW dbo.Rizviz_Interviews_Live AS
/* Scheduled interview (intv_datetime) */
SELECT
    CAST(d.interview_seq_code AS int) AS id,
    CAST(ROW_NUMBER() OVER (ORDER BY d.intv_datetime DESC, d.interview_seq_code) AS int) AS sr,
    CAST(
        CASE
            WHEN m.interview_to = 1 THEN 'TGS'
            WHEN m.interview_to = 2 THEN 'Silmun'
            ELSE ISNULL(CAST(m.interview_to AS nvarchar(50)), '')
        END AS nvarchar(100)
    ) AS inv_to,
    CAST(d.intv_datetime AS datetime) AS interview_date,
    CAST(
        COALESCE(
            NULLIF(RTRIM(po.profile_name), ''),
            NULLIF(RTRIM(m.position), ''),
            NULLIF(RTRIM(ent.full_name), ''),
            NULLIF(RTRIM(ent.first_name), ''),
            CAST(m.lead_code AS nvarchar(100))
        ) AS nvarchar(255)
    ) AS interview_for,
    /* Developer (Interviewee) Name */
    CAST(
        COALESCE(
            NULLIF(RTRIM(ent.full_name), ''),
            NULLIF(RTRIM(ent.first_name), ''),
            CASE 
                WHEN LOWER(RTRIM(LTRIM(ISNULL(m.recruiter_name, '')))) IN ('admin', 'syed musa', 'syedmusa') THEN NULL 
                ELSE NULLIF(RTRIM(m.recruiter_name), '') 
            END,
            NULLIF(RTRIM(po.profile_name), ''),
            'Unassigned'
        ) AS nvarchar(255)
    ) AS interviewee_name,
    /* BD / Added by Name - Resolves PowerBuilder login */
    CAST(
        CASE 
            WHEN LOWER(RTRIM(LTRIM(COALESCE(m.insert_by, d.insert_by, '')))) IN ('admin', 'syed musa', 'syedmusa') THEN 'Syed Musa'
            ELSE COALESCE(
                NULLIF(RTRIM(u_master.FullName), ''),
                NULLIF(RTRIM(u_detail.FullName), ''),
                NULLIF(RTRIM(m.insert_by), ''),
                NULLIF(RTRIM(d.insert_by), ''),
                'Unassigned'
            )
        END AS nvarchar(255)
    ) AS job_hunter_name,
    CAST(ISNULL(NULLIF(RTRIM(m.company_name), ''), 'Unknown') AS nvarchar(255)) AS company_name,
    CAST(
        CASE RTRIM(ISNULL(d.intv_type, ''))
            WHEN 'T' THEN 'Technical'
            WHEN 'S' THEN 'Screening'
            WHEN 'N' THEN 'Non-Technical'
            WHEN 'D' THEN 'Demo'
            WHEN '' THEN 'Interview'
            ELSE RTRIM(d.intv_type)
        END AS nvarchar(100)
    ) AS interview_type,
    CAST(d.intv_datetime AS datetime) AS job_start_date,
    CAST(m.Job_landed_date AS datetime) AS job_close_date,
    CAST('' AS nvarchar(50)) AS first_salary,
    CAST('' AS nvarchar(255)) AS jh_suggest,
    CAST(0 AS decimal(12,2)) AS interview_charges,
    CAST(0 AS decimal(12,2)) AS jh_due,
    CAST(0 AS decimal(12,2)) AS first_payment_on_job,
    CAST(0 AS decimal(12,2)) AS second_payment_on_job,
    CAST(0 AS decimal(12,2)) AS balance_payable,
    CAST(ISNULL(d.insert_time, GETUTCDATE()) AS datetime2) AS created_at,
    CAST(ISNULL(d.insert_time, GETUTCDATE()) AS datetime2) AS updated_at,
    /* Extra columns required by EF Core Interview model */
    CAST(CAST(d.interview_code AS nvarchar(100)) AS nvarchar(100)) AS interview_code,
    CAST(
        CASE UPPER(RTRIM(ISNULL(d.intv_status, '')))
            WHEN 'S' THEN 'Scheduled'
            WHEN 'SCHEDULED' THEN 'Scheduled'
            WHEN 'C' THEN 'Completed'
            WHEN 'COMPLETED' THEN 'Completed'
            WHEN 'CONVERTED' THEN 'Converted'
            WHEN 'X' THEN 'Cancelled'
            WHEN 'CANCELLED' THEN 'Cancelled'
            WHEN 'DROPPED' THEN 'Dropped'
            WHEN 'DEAD' THEN 'Dead'
            WHEN 'P' THEN 'Pending'
            WHEN 'PENDING' THEN 'Pending'
            WHEN 'POSTPONED' THEN 'Postponed'
            WHEN 'R' THEN 'Rejected'
            WHEN 'REJECTED' THEN 'Rejected'
            WHEN 'H' THEN 'Hired'
            WHEN 'HIRED' THEN 'Hired'
            WHEN 'CLOSED' THEN 'Closed'
            WHEN '' THEN 'Scheduled'
            ELSE RTRIM(d.intv_status)
        END AS nvarchar(50)
    ) AS status,
    CAST(ISNULL(RTRIM(stk.stack_name), NULL) AS nvarchar(50)) AS stack,
    CAST(NULL AS datetime2) AS last_synced_at,
    CAST(NULL AS nvarchar(max)) AS raw_row_json,
    /* PowerBuilder scheduler fields */
    CAST(ISNULL(NULLIF(RTRIM(m.direct_self), ''), 'Self') AS nvarchar(50)) AS direct_self,
    CAST(RTRIM(m.position) AS nvarchar(100)) AS location,
    CAST(RTRIM(m.staffing_firm) AS nvarchar(255)) AS staffing_firm,
    CAST(RTRIM(m.implementation_partner) AS nvarchar(255)) AS implementation_partner,
    CAST(m.payscale_val AS decimal(12,2)) AS payscale_val,
    CAST(ISNULL(RTRIM(m.payscale_unit), '/yr') AS nvarchar(50)) AS payscale_unit,
    CAST(RTRIM(m.recruiter_name) AS nvarchar(255)) AS recruiter_name,
    CAST(RTRIM(m.job_reference) AS nvarchar(255)) AS job_reference,
    CAST(RTRIM(m.rejection_reason) AS nvarchar(255)) AS rejection_reason,
    CAST(RTRIM(m.remarks) AS nvarchar(500)) AS remarks,
    CAST(ISNULL(RTRIM(d.time_Zone), 'EST') AS nvarchar(50)) AS time_zone,
    CAST(ISNULL(RTRIM(d.BD_feedback), RTRIM(d.Dev_feedback)) AS nvarchar(max)) AS client_feedback,
    CAST(RTRIM(d.meeting_link) AS nvarchar(500)) AS meeting_link,
    CAST(CAST(m.lead_code AS nvarchar(100)) AS nvarchar(255)) AS lead_name
FROM mkt.interview_detail d
INNER JOIN mkt.interview_master m ON d.interview_code = m.interview_code
LEFT JOIN prof.Profile_Owners po ON m.PrfOwn_code = po.PrfOwn_code
LEFT JOIN hrms.entity ent ON COALESCE(d.entity_code, m.entity_code) = ent.entity_code
LEFT JOIN setups.stacks stk ON stk.stack_code = COALESCE(d.stack_code, m.stack_code)
LEFT JOIN dbo.Rizviz_Users u_master ON LOWER(RTRIM(LTRIM(m.insert_by))) = LOWER(RTRIM(LTRIM(u_master.Username)))
LEFT JOIN dbo.Rizviz_Users u_detail ON LOWER(RTRIM(LTRIM(d.insert_by))) = LOWER(RTRIM(LTRIM(u_detail.Username)))
WHERE d.intv_datetime IS NOT NULL

UNION ALL

/* Job landed date - extra calendar event when different from interview date */
SELECT
    CAST(d.interview_seq_code AS int) + 5000000 AS id,
    CAST(ROW_NUMBER() OVER (ORDER BY m.Job_landed_date DESC, d.interview_seq_code) AS int) AS sr,
    CAST(
        CASE
            WHEN m.interview_to = 1 THEN 'TGS'
            WHEN m.interview_to = 2 THEN 'Silmun'
            ELSE ISNULL(CAST(m.interview_to AS nvarchar(50)), '')
        END AS nvarchar(100)
    ) AS inv_to,
    CAST(m.Job_landed_date AS datetime) AS interview_date,
    CAST(
        COALESCE(
            NULLIF(RTRIM(po.profile_name), ''),
            NULLIF(RTRIM(m.position), ''),
            NULLIF(RTRIM(ent.full_name), ''),
            NULLIF(RTRIM(ent.first_name), ''),
            CAST(m.lead_code AS nvarchar(100))
        ) AS nvarchar(255)
    ) AS interview_for,
    CAST(
        COALESCE(
            NULLIF(RTRIM(ent.full_name), ''),
            NULLIF(RTRIM(ent.first_name), ''),
            CASE 
                WHEN LOWER(RTRIM(LTRIM(ISNULL(m.recruiter_name, '')))) IN ('admin', 'syed musa', 'syedmusa') THEN NULL 
                ELSE NULLIF(RTRIM(m.recruiter_name), '') 
            END,
            NULLIF(RTRIM(po.profile_name), ''),
            'Unassigned'
        ) AS nvarchar(255)
    ) AS interviewee_name,
    CAST(
        CASE 
            WHEN LOWER(RTRIM(LTRIM(COALESCE(m.insert_by, d.insert_by, '')))) IN ('admin', 'syed musa', 'syedmusa') THEN 'Syed Musa'
            ELSE COALESCE(
                NULLIF(RTRIM(u_master.FullName), ''),
                NULLIF(RTRIM(u_detail.FullName), ''),
                NULLIF(RTRIM(m.insert_by), ''),
                NULLIF(RTRIM(d.insert_by), ''),
                'Unassigned'
            )
        END AS nvarchar(255)
    ) AS job_hunter_name,
    CAST(ISNULL(NULLIF(RTRIM(m.company_name), ''), 'Unknown') AS nvarchar(255)) AS company_name,
    CAST('Job Landed' AS nvarchar(100)) AS interview_type,
    CAST(m.Job_landed_date AS datetime) AS job_start_date,
    CAST(m.Job_landed_date AS datetime) AS job_close_date,
    CAST('' AS nvarchar(50)) AS first_salary,
    CAST('' AS nvarchar(255)) AS jh_suggest,
    CAST(0 AS decimal(12,2)) AS interview_charges,
    CAST(0 AS decimal(12,2)) AS jh_due,
    CAST(0 AS decimal(12,2)) AS first_payment_on_job,
    CAST(0 AS decimal(12,2)) AS second_payment_on_job,
    CAST(0 AS decimal(12,2)) AS balance_payable,
    CAST(ISNULL(m.insert_time, GETUTCDATE()) AS datetime2) AS created_at,
    CAST(ISNULL(m.insert_time, GETUTCDATE()) AS datetime2) AS updated_at,
    CAST(CAST(d.interview_code AS nvarchar(100)) AS nvarchar(100)) AS interview_code,
    CAST('Hired' AS nvarchar(50)) AS status,
    CAST(ISNULL(RTRIM(stk.stack_name), NULL) AS nvarchar(50)) AS stack,
    CAST(NULL AS datetime2) AS last_synced_at,
    CAST(NULL AS nvarchar(max)) AS raw_row_json,
    CAST(ISNULL(RTRIM(m.direct_self), 'Self') AS nvarchar(50)) AS direct_self,
    CAST(RTRIM(m.position) AS nvarchar(100)) AS location,
    CAST(RTRIM(m.staffing_firm) AS nvarchar(255)) AS staffing_firm,
    CAST(RTRIM(m.implementation_partner) AS nvarchar(255)) AS implementation_partner,
    CAST(m.payscale_val AS decimal(12,2)) AS payscale_val,
    CAST(ISNULL(RTRIM(m.payscale_unit), '/yr') AS nvarchar(50)) AS payscale_unit,
    CAST(RTRIM(m.recruiter_name) AS nvarchar(255)) AS recruiter_name,
    CAST(RTRIM(m.job_reference) AS nvarchar(255)) AS job_reference,
    CAST(RTRIM(m.rejection_reason) AS nvarchar(255)) AS rejection_reason,
    CAST(RTRIM(m.remarks) AS nvarchar(500)) AS remarks,
    CAST(ISNULL(RTRIM(d.time_Zone), 'EST') AS nvarchar(50)) AS time_zone,
    CAST(ISNULL(RTRIM(d.BD_feedback), RTRIM(d.Dev_feedback)) AS nvarchar(max)) AS client_feedback,
    CAST(RTRIM(d.meeting_link) AS nvarchar(500)) AS meeting_link,
    CAST(CAST(m.lead_code AS nvarchar(100)) AS nvarchar(255)) AS lead_name
FROM mkt.interview_detail d
INNER JOIN mkt.interview_master m ON d.interview_code = m.interview_code
LEFT JOIN prof.Profile_Owners po ON m.PrfOwn_code = po.PrfOwn_code
LEFT JOIN hrms.entity ent ON COALESCE(d.entity_code, m.entity_code) = ent.entity_code
LEFT JOIN setups.stacks stk ON stk.stack_code = COALESCE(d.stack_code, m.stack_code)
LEFT JOIN dbo.Rizviz_Users u_master ON LOWER(RTRIM(LTRIM(m.insert_by))) = LOWER(RTRIM(LTRIM(u_master.Username)))
LEFT JOIN dbo.Rizviz_Users u_detail ON LOWER(RTRIM(LTRIM(d.insert_by))) = LOWER(RTRIM(LTRIM(u_detail.Username)))
WHERE m.Job_landed_date IS NOT NULL
  AND (d.intv_datetime IS NULL OR CAST(m.Job_landed_date AS date) <> CAST(d.intv_datetime AS date));
GO

PRINT 'Rizviz_Interviews_Live view successfully updated with Syed Musa and full schema.';
GO
