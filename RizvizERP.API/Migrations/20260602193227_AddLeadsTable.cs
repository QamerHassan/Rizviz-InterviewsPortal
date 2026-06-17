using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RizvizERP.API.Migrations
{
    /// <inheritdoc />
    public partial class AddLeadsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Addresses_Employees_EmployeeId",
                table: "Addresses");

            migrationBuilder.DropForeignKey(
                name: "FK_BankInformations_Employees_EmployeeId",
                table: "BankInformations");

            migrationBuilder.DropForeignKey(
                name: "FK_BloodRelations_Employees_EmployeeId",
                table: "BloodRelations");

            migrationBuilder.DropForeignKey(
                name: "FK_DepartmentTeams_Employees_EmployeeId",
                table: "DepartmentTeams");

            migrationBuilder.DropForeignKey(
                name: "FK_Documents_Employees_EmployeeId",
                table: "Documents");

            migrationBuilder.DropForeignKey(
                name: "FK_EducationRecords_Employees_EmployeeId",
                table: "EducationRecords");

            migrationBuilder.DropForeignKey(
                name: "FK_EmergencyContacts_Employees_EmployeeId",
                table: "EmergencyContacts");

            migrationBuilder.DropForeignKey(
                name: "FK_EmployeeProjects_Employees_EmployeeId",
                table: "EmployeeProjects");

            migrationBuilder.DropForeignKey(
                name: "FK_EmploymentHistories_Employees_EmployeeId",
                table: "EmploymentHistories");

            migrationBuilder.DropForeignKey(
                name: "FK_FunctionalRoleHistories_Employees_EmployeeId",
                table: "FunctionalRoleHistories");

            migrationBuilder.DropForeignKey(
                name: "FK_HealthRecords_Employees_EmployeeId",
                table: "HealthRecords");

            migrationBuilder.DropForeignKey(
                name: "FK_HrLetters_Employees_EmployeeId",
                table: "HrLetters");

            migrationBuilder.DropForeignKey(
                name: "FK_LineManagerHistories_Employees_EmployeeId",
                table: "LineManagerHistories");

            migrationBuilder.DropForeignKey(
                name: "FK_LoansAdvances_Employees_EmployeeId",
                table: "LoansAdvances");

            migrationBuilder.DropForeignKey(
                name: "FK_OtherIncomes_Employees_EmployeeId",
                table: "OtherIncomes");

            migrationBuilder.DropForeignKey(
                name: "FK_SalaryHistories_Employees_EmployeeId",
                table: "SalaryHistories");

            migrationBuilder.DropForeignKey(
                name: "FK_SalaryIncrements_Employees_EmployeeId",
                table: "SalaryIncrements");

            migrationBuilder.DropTable(
                name: "Assets");

            migrationBuilder.DropTable(
                name: "Projects");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Users",
                table: "Users");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Roles",
                table: "Roles");

            migrationBuilder.DropPrimaryKey(
                name: "PK_PayrollProcesses",
                table: "PayrollProcesses");

            migrationBuilder.DropPrimaryKey(
                name: "PK_PayrollDetails",
                table: "PayrollDetails");

            migrationBuilder.DropPrimaryKey(
                name: "PK_JobPostings",
                table: "JobPostings");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Interviews",
                table: "Interviews");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Employees",
                table: "Employees");

            migrationBuilder.DropPrimaryKey(
                name: "PK_DropdownValues",
                table: "DropdownValues");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Companies",
                table: "Companies");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Candidates",
                table: "Candidates");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Branches",
                table: "Branches");

            migrationBuilder.DropPrimaryKey(
                name: "PK_AuditLogs",
                table: "AuditLogs");

            migrationBuilder.EnsureSchema(
                name: "dbo");

            migrationBuilder.RenameTable(
                name: "Users",
                newName: "Rizviz_Users",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "Roles",
                newName: "Rizviz_Roles",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "PayrollProcesses",
                newName: "Rizviz_PayrollProcesses",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "PayrollDetails",
                newName: "Rizviz_PayrollDetails",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "JobPostings",
                newName: "Rizviz_JobPostings",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "Interviews",
                newName: "Rizviz_Interviews",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "Employees",
                newName: "Rizviz_Employees",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "DropdownValues",
                newName: "Rizviz_DropdownValues",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "Companies",
                newName: "Rizviz_Companies",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "Candidates",
                newName: "Rizviz_Candidates",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "Branches",
                newName: "Rizviz_Branches",
                newSchema: "dbo");

            migrationBuilder.RenameTable(
                name: "AuditLogs",
                newName: "Rizviz_AuditLogs",
                newSchema: "dbo");

            migrationBuilder.AddColumn<string>(
                name: "InterviewName",
                schema: "dbo",
                table: "Rizviz_Users",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "interview_code",
                schema: "dbo",
                table: "Rizviz_Interviews",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "last_synced_at",
                schema: "dbo",
                table: "Rizviz_Interviews",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "raw_row_json",
                schema: "dbo",
                table: "Rizviz_Interviews",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "status",
                schema: "dbo",
                table: "Rizviz_Interviews",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_Rizviz_Users",
                schema: "dbo",
                table: "Rizviz_Users",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Rizviz_Roles",
                schema: "dbo",
                table: "Rizviz_Roles",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Rizviz_PayrollProcesses",
                schema: "dbo",
                table: "Rizviz_PayrollProcesses",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Rizviz_PayrollDetails",
                schema: "dbo",
                table: "Rizviz_PayrollDetails",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Rizviz_JobPostings",
                schema: "dbo",
                table: "Rizviz_JobPostings",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Rizviz_Interviews",
                schema: "dbo",
                table: "Rizviz_Interviews",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Rizviz_Employees",
                schema: "dbo",
                table: "Rizviz_Employees",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Rizviz_DropdownValues",
                schema: "dbo",
                table: "Rizviz_DropdownValues",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Rizviz_Companies",
                schema: "dbo",
                table: "Rizviz_Companies",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Rizviz_Candidates",
                schema: "dbo",
                table: "Rizviz_Candidates",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Rizviz_Branches",
                schema: "dbo",
                table: "Rizviz_Branches",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Rizviz_AuditLogs",
                schema: "dbo",
                table: "Rizviz_AuditLogs",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "leads",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    company_name = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    status = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    entertains = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    bd_closer = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    is_converted = table.Column<bool>(type: "bit", nullable: false),
                    rounds = table.Column<int>(type: "int", nullable: true),
                    last_activity = table.Column<DateTime>(type: "date", nullable: true),
                    is_manual = table.Column<bool>(type: "bit", nullable: false),
                    notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    updated_at = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_leads", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "Rizviz_InterviewHistory",
                schema: "dbo",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    interview_id = table.Column<int>(type: "int", nullable: false),
                    interview_code = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    old_status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    new_status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    old_recruiter = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    new_recruiter = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    old_interview_date = table.Column<DateTime>(type: "datetime2", nullable: true),
                    new_interview_date = table.Column<DateTime>(type: "datetime2", nullable: true),
                    changed_by = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    changed_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    change_summary = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Rizviz_InterviewHistory", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "Rizviz_InterviewSyncLog",
                schema: "dbo",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    synced_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    source_path = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    total_rows = table.Column<int>(type: "int", nullable: false),
                    inserted_rows = table.Column<int>(type: "int", nullable: false),
                    updated_rows = table.Column<int>(type: "int", nullable: false),
                    unchanged_rows = table.Column<int>(type: "int", nullable: false),
                    failed_rows = table.Column<int>(type: "int", nullable: false),
                    error_message = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Rizviz_InterviewSyncLog", x => x.id);
                });

            migrationBuilder.AddForeignKey(
                name: "FK_Addresses_Rizviz_Employees_EmployeeId",
                table: "Addresses",
                column: "EmployeeId",
                principalSchema: "dbo",
                principalTable: "Rizviz_Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_BankInformations_Rizviz_Employees_EmployeeId",
                table: "BankInformations",
                column: "EmployeeId",
                principalSchema: "dbo",
                principalTable: "Rizviz_Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_BloodRelations_Rizviz_Employees_EmployeeId",
                table: "BloodRelations",
                column: "EmployeeId",
                principalSchema: "dbo",
                principalTable: "Rizviz_Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_DepartmentTeams_Rizviz_Employees_EmployeeId",
                table: "DepartmentTeams",
                column: "EmployeeId",
                principalSchema: "dbo",
                principalTable: "Rizviz_Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Documents_Rizviz_Employees_EmployeeId",
                table: "Documents",
                column: "EmployeeId",
                principalSchema: "dbo",
                principalTable: "Rizviz_Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_EducationRecords_Rizviz_Employees_EmployeeId",
                table: "EducationRecords",
                column: "EmployeeId",
                principalSchema: "dbo",
                principalTable: "Rizviz_Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_EmergencyContacts_Rizviz_Employees_EmployeeId",
                table: "EmergencyContacts",
                column: "EmployeeId",
                principalSchema: "dbo",
                principalTable: "Rizviz_Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_EmployeeProjects_Rizviz_Employees_EmployeeId",
                table: "EmployeeProjects",
                column: "EmployeeId",
                principalSchema: "dbo",
                principalTable: "Rizviz_Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_EmploymentHistories_Rizviz_Employees_EmployeeId",
                table: "EmploymentHistories",
                column: "EmployeeId",
                principalSchema: "dbo",
                principalTable: "Rizviz_Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_FunctionalRoleHistories_Rizviz_Employees_EmployeeId",
                table: "FunctionalRoleHistories",
                column: "EmployeeId",
                principalSchema: "dbo",
                principalTable: "Rizviz_Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_HealthRecords_Rizviz_Employees_EmployeeId",
                table: "HealthRecords",
                column: "EmployeeId",
                principalSchema: "dbo",
                principalTable: "Rizviz_Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_HrLetters_Rizviz_Employees_EmployeeId",
                table: "HrLetters",
                column: "EmployeeId",
                principalSchema: "dbo",
                principalTable: "Rizviz_Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LineManagerHistories_Rizviz_Employees_EmployeeId",
                table: "LineManagerHistories",
                column: "EmployeeId",
                principalSchema: "dbo",
                principalTable: "Rizviz_Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LoansAdvances_Rizviz_Employees_EmployeeId",
                table: "LoansAdvances",
                column: "EmployeeId",
                principalSchema: "dbo",
                principalTable: "Rizviz_Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_OtherIncomes_Rizviz_Employees_EmployeeId",
                table: "OtherIncomes",
                column: "EmployeeId",
                principalSchema: "dbo",
                principalTable: "Rizviz_Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SalaryHistories_Rizviz_Employees_EmployeeId",
                table: "SalaryHistories",
                column: "EmployeeId",
                principalSchema: "dbo",
                principalTable: "Rizviz_Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SalaryIncrements_Rizviz_Employees_EmployeeId",
                table: "SalaryIncrements",
                column: "EmployeeId",
                principalSchema: "dbo",
                principalTable: "Rizviz_Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Addresses_Rizviz_Employees_EmployeeId",
                table: "Addresses");

            migrationBuilder.DropForeignKey(
                name: "FK_BankInformations_Rizviz_Employees_EmployeeId",
                table: "BankInformations");

            migrationBuilder.DropForeignKey(
                name: "FK_BloodRelations_Rizviz_Employees_EmployeeId",
                table: "BloodRelations");

            migrationBuilder.DropForeignKey(
                name: "FK_DepartmentTeams_Rizviz_Employees_EmployeeId",
                table: "DepartmentTeams");

            migrationBuilder.DropForeignKey(
                name: "FK_Documents_Rizviz_Employees_EmployeeId",
                table: "Documents");

            migrationBuilder.DropForeignKey(
                name: "FK_EducationRecords_Rizviz_Employees_EmployeeId",
                table: "EducationRecords");

            migrationBuilder.DropForeignKey(
                name: "FK_EmergencyContacts_Rizviz_Employees_EmployeeId",
                table: "EmergencyContacts");

            migrationBuilder.DropForeignKey(
                name: "FK_EmployeeProjects_Rizviz_Employees_EmployeeId",
                table: "EmployeeProjects");

            migrationBuilder.DropForeignKey(
                name: "FK_EmploymentHistories_Rizviz_Employees_EmployeeId",
                table: "EmploymentHistories");

            migrationBuilder.DropForeignKey(
                name: "FK_FunctionalRoleHistories_Rizviz_Employees_EmployeeId",
                table: "FunctionalRoleHistories");

            migrationBuilder.DropForeignKey(
                name: "FK_HealthRecords_Rizviz_Employees_EmployeeId",
                table: "HealthRecords");

            migrationBuilder.DropForeignKey(
                name: "FK_HrLetters_Rizviz_Employees_EmployeeId",
                table: "HrLetters");

            migrationBuilder.DropForeignKey(
                name: "FK_LineManagerHistories_Rizviz_Employees_EmployeeId",
                table: "LineManagerHistories");

            migrationBuilder.DropForeignKey(
                name: "FK_LoansAdvances_Rizviz_Employees_EmployeeId",
                table: "LoansAdvances");

            migrationBuilder.DropForeignKey(
                name: "FK_OtherIncomes_Rizviz_Employees_EmployeeId",
                table: "OtherIncomes");

            migrationBuilder.DropForeignKey(
                name: "FK_SalaryHistories_Rizviz_Employees_EmployeeId",
                table: "SalaryHistories");

            migrationBuilder.DropForeignKey(
                name: "FK_SalaryIncrements_Rizviz_Employees_EmployeeId",
                table: "SalaryIncrements");

            migrationBuilder.DropTable(
                name: "leads");

            migrationBuilder.DropTable(
                name: "Rizviz_InterviewHistory",
                schema: "dbo");

            migrationBuilder.DropTable(
                name: "Rizviz_InterviewSyncLog",
                schema: "dbo");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Rizviz_Users",
                schema: "dbo",
                table: "Rizviz_Users");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Rizviz_Roles",
                schema: "dbo",
                table: "Rizviz_Roles");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Rizviz_PayrollProcesses",
                schema: "dbo",
                table: "Rizviz_PayrollProcesses");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Rizviz_PayrollDetails",
                schema: "dbo",
                table: "Rizviz_PayrollDetails");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Rizviz_JobPostings",
                schema: "dbo",
                table: "Rizviz_JobPostings");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Rizviz_Interviews",
                schema: "dbo",
                table: "Rizviz_Interviews");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Rizviz_Employees",
                schema: "dbo",
                table: "Rizviz_Employees");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Rizviz_DropdownValues",
                schema: "dbo",
                table: "Rizviz_DropdownValues");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Rizviz_Companies",
                schema: "dbo",
                table: "Rizviz_Companies");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Rizviz_Candidates",
                schema: "dbo",
                table: "Rizviz_Candidates");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Rizviz_Branches",
                schema: "dbo",
                table: "Rizviz_Branches");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Rizviz_AuditLogs",
                schema: "dbo",
                table: "Rizviz_AuditLogs");

            migrationBuilder.DropColumn(
                name: "InterviewName",
                schema: "dbo",
                table: "Rizviz_Users");

            migrationBuilder.DropColumn(
                name: "interview_code",
                schema: "dbo",
                table: "Rizviz_Interviews");

            migrationBuilder.DropColumn(
                name: "last_synced_at",
                schema: "dbo",
                table: "Rizviz_Interviews");

            migrationBuilder.DropColumn(
                name: "raw_row_json",
                schema: "dbo",
                table: "Rizviz_Interviews");

            migrationBuilder.DropColumn(
                name: "status",
                schema: "dbo",
                table: "Rizviz_Interviews");

            migrationBuilder.RenameTable(
                name: "Rizviz_Users",
                schema: "dbo",
                newName: "Users");

            migrationBuilder.RenameTable(
                name: "Rizviz_Roles",
                schema: "dbo",
                newName: "Roles");

            migrationBuilder.RenameTable(
                name: "Rizviz_PayrollProcesses",
                schema: "dbo",
                newName: "PayrollProcesses");

            migrationBuilder.RenameTable(
                name: "Rizviz_PayrollDetails",
                schema: "dbo",
                newName: "PayrollDetails");

            migrationBuilder.RenameTable(
                name: "Rizviz_JobPostings",
                schema: "dbo",
                newName: "JobPostings");

            migrationBuilder.RenameTable(
                name: "Rizviz_Interviews",
                schema: "dbo",
                newName: "Interviews");

            migrationBuilder.RenameTable(
                name: "Rizviz_Employees",
                schema: "dbo",
                newName: "Employees");

            migrationBuilder.RenameTable(
                name: "Rizviz_DropdownValues",
                schema: "dbo",
                newName: "DropdownValues");

            migrationBuilder.RenameTable(
                name: "Rizviz_Companies",
                schema: "dbo",
                newName: "Companies");

            migrationBuilder.RenameTable(
                name: "Rizviz_Candidates",
                schema: "dbo",
                newName: "Candidates");

            migrationBuilder.RenameTable(
                name: "Rizviz_Branches",
                schema: "dbo",
                newName: "Branches");

            migrationBuilder.RenameTable(
                name: "Rizviz_AuditLogs",
                schema: "dbo",
                newName: "AuditLogs");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Users",
                table: "Users",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Roles",
                table: "Roles",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_PayrollProcesses",
                table: "PayrollProcesses",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_PayrollDetails",
                table: "PayrollDetails",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_JobPostings",
                table: "JobPostings",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Interviews",
                table: "Interviews",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Employees",
                table: "Employees",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_DropdownValues",
                table: "DropdownValues",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Companies",
                table: "Companies",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Candidates",
                table: "Candidates",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Branches",
                table: "Branches",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_AuditLogs",
                table: "AuditLogs",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "Assets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AssetCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Category = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PurchaseDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SerialNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Value = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Assets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Projects",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Budget = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ClientName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProjectCode = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Projects", x => x.Id);
                });

            migrationBuilder.AddForeignKey(
                name: "FK_Addresses_Employees_EmployeeId",
                table: "Addresses",
                column: "EmployeeId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_BankInformations_Employees_EmployeeId",
                table: "BankInformations",
                column: "EmployeeId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_BloodRelations_Employees_EmployeeId",
                table: "BloodRelations",
                column: "EmployeeId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_DepartmentTeams_Employees_EmployeeId",
                table: "DepartmentTeams",
                column: "EmployeeId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Documents_Employees_EmployeeId",
                table: "Documents",
                column: "EmployeeId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_EducationRecords_Employees_EmployeeId",
                table: "EducationRecords",
                column: "EmployeeId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_EmergencyContacts_Employees_EmployeeId",
                table: "EmergencyContacts",
                column: "EmployeeId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_EmployeeProjects_Employees_EmployeeId",
                table: "EmployeeProjects",
                column: "EmployeeId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_EmploymentHistories_Employees_EmployeeId",
                table: "EmploymentHistories",
                column: "EmployeeId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_FunctionalRoleHistories_Employees_EmployeeId",
                table: "FunctionalRoleHistories",
                column: "EmployeeId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_HealthRecords_Employees_EmployeeId",
                table: "HealthRecords",
                column: "EmployeeId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_HrLetters_Employees_EmployeeId",
                table: "HrLetters",
                column: "EmployeeId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LineManagerHistories_Employees_EmployeeId",
                table: "LineManagerHistories",
                column: "EmployeeId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LoansAdvances_Employees_EmployeeId",
                table: "LoansAdvances",
                column: "EmployeeId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_OtherIncomes_Employees_EmployeeId",
                table: "OtherIncomes",
                column: "EmployeeId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SalaryHistories_Employees_EmployeeId",
                table: "SalaryHistories",
                column: "EmployeeId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_SalaryIncrements_Employees_EmployeeId",
                table: "SalaryIncrements",
                column: "EmployeeId",
                principalTable: "Employees",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
