/*
  RUN IN SSMS on Accounting_System_UAT
  Maps live marketing interview data (mkt.interview_master + mkt.interview_detail)
  to the shape expected by Rizviz ERP Interviews API / calendar.
  Includes a second row per interview when Job_landed_date differs (more calendar coverage).
*/

USE Accounting_System_UAT;
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
    CAST(d.intv_datetime AS date) AS interview_date,
    CAST(
        COALESCE(
            NULLIF(RTRIM(m.position), ''),
            NULLIF(RTRIM(ent.full_name), ''),
            NULLIF(RTRIM(ent.first_name), ''),
            CAST(m.lead_code AS nvarchar(100))
        ) AS nvarchar(255)
    ) AS interview_for,
    CAST(
        COALESCE(
            NULLIF(RTRIM(m.recruiter_name), ''),
            NULLIF(RTRIM(ent.full_name), ''),
            NULLIF(RTRIM(d.insert_by), ''),
            'Unassigned'
        ) AS nvarchar(255)
    ) AS interviewee_name,
    CAST(ISNULL(NULLIF(RTRIM(m.insert_by), ''), NULLIF(RTRIM(d.insert_by), '')) AS nvarchar(255)) AS job_hunter_name,
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
    CAST(d.intv_datetime AS date) AS job_start_date,
    CAST(m.Job_landed_date AS date) AS job_close_date,
    CAST('' AS nvarchar(50)) AS first_salary,
    CAST('' AS nvarchar(255)) AS jh_suggest,
    CAST(0 AS decimal(12,2)) AS interview_charges,
    CAST(0 AS decimal(12,2)) AS jh_due,
    CAST(0 AS decimal(12,2)) AS first_payment_on_job,
    CAST(0 AS decimal(12,2)) AS second_payment_on_job,
    CAST(0 AS decimal(12,2)) AS balance_payable,
    CAST(ISNULL(d.insert_time, GETUTCDATE()) AS datetime2) AS created_at,
    CAST(ISNULL(d.insert_time, GETUTCDATE()) AS datetime2) AS updated_at
FROM mkt.interview_detail d
INNER JOIN mkt.interview_master m ON d.interview_code = m.interview_code
LEFT JOIN hrms.entity ent ON m.entity_code = ent.entity_code
WHERE d.intv_datetime IS NOT NULL

UNION ALL

/* Job landed date — extra calendar event when different from interview date */
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
    CAST(m.Job_landed_date AS date) AS interview_date,
    CAST(
        COALESCE(
            NULLIF(RTRIM(m.position), ''),
            NULLIF(RTRIM(ent.full_name), ''),
            NULLIF(RTRIM(ent.first_name), ''),
            CAST(m.lead_code AS nvarchar(100))
        ) AS nvarchar(255)
    ) AS interview_for,
    CAST(
        COALESCE(
            NULLIF(RTRIM(m.recruiter_name), ''),
            NULLIF(RTRIM(ent.full_name), ''),
            NULLIF(RTRIM(d.insert_by), ''),
            'Unassigned'
        ) AS nvarchar(255)
    ) AS interviewee_name,
    CAST(ISNULL(NULLIF(RTRIM(m.insert_by), ''), NULLIF(RTRIM(d.insert_by), '')) AS nvarchar(255)) AS job_hunter_name,
    CAST(ISNULL(NULLIF(RTRIM(m.company_name), ''), 'Unknown') AS nvarchar(255)) AS company_name,
    CAST('Job Landed' AS nvarchar(100)) AS interview_type,
    CAST(m.Job_landed_date AS date) AS job_start_date,
    CAST(m.Job_landed_date AS date) AS job_close_date,
    CAST('' AS nvarchar(50)) AS first_salary,
    CAST('' AS nvarchar(255)) AS jh_suggest,
    CAST(0 AS decimal(12,2)) AS interview_charges,
    CAST(0 AS decimal(12,2)) AS jh_due,
    CAST(0 AS decimal(12,2)) AS first_payment_on_job,
    CAST(0 AS decimal(12,2)) AS second_payment_on_job,
    CAST(0 AS decimal(12,2)) AS balance_payable,
    CAST(ISNULL(m.insert_time, GETUTCDATE()) AS datetime2) AS created_at,
    CAST(ISNULL(m.insert_time, GETUTCDATE()) AS datetime2) AS updated_at
FROM mkt.interview_detail d
INNER JOIN mkt.interview_master m ON d.interview_code = m.interview_code
LEFT JOIN hrms.entity ent ON m.entity_code = ent.entity_code
WHERE m.Job_landed_date IS NOT NULL
  AND (d.intv_datetime IS NULL OR CAST(m.Job_landed_date AS date) <> CAST(d.intv_datetime AS date));
GO

PRINT 'Rizviz_Interviews_Live view created (scheduled + job landed dates).';
GO
