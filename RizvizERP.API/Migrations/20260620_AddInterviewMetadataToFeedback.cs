using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RizvizERP.API.Migrations
{
    /// <inheritdoc />
    public partial class AddInterviewMetadataToFeedback : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "status",
                table: "interview_feedback",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "inv_to",
                table: "interview_feedback",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "interview_for",
                table: "interview_feedback",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "job_start_date",
                table: "interview_feedback",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "job_close_date",
                table: "interview_feedback",
                type: "date",
                nullable: true);

            // ── Backfill the existing feedback rows with interview metadata ────────
            // These 4 rows were saved before this migration existed, so their
            // Status/InvTo/InterviewFor columns are NULL. Update them from the
            // known Excel/allInterviews data.
            migrationBuilder.Sql(@"
                UPDATE interview_feedback SET
                    status       = 'Converted',
                    inv_to       = 'Silmun',
                    interview_for = 'Rehan Ahmad (EXE) Co Azfer'
                WHERE sr = 4472;

                UPDATE interview_feedback SET
                    status        = 'Cancelled',
                    inv_to        = 'Silmun',
                    interview_for = 'Anna Zaidi',
                    job_start_date = '2026-04-21'
                WHERE sr = 4576;

                UPDATE interview_feedback SET
                    status        = 'Cancelled',
                    inv_to        = 'Silmun',
                    interview_for = 'Furqan Saeed'
                WHERE sr = 4707;

                UPDATE interview_feedback SET
                    status        = 'Passed',
                    inv_to        = 'Silmun',
                    interview_for = 'Abbas Zaidi'
                WHERE sr = 5755;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "status",         table: "interview_feedback");
            migrationBuilder.DropColumn(name: "inv_to",         table: "interview_feedback");
            migrationBuilder.DropColumn(name: "interview_for",  table: "interview_feedback");
            migrationBuilder.DropColumn(name: "job_start_date", table: "interview_feedback");
            migrationBuilder.DropColumn(name: "job_close_date", table: "interview_feedback");
        }
    }
}
