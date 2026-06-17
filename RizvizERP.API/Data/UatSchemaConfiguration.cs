using Microsoft.EntityFrameworkCore;
using RizvizERP.API.Models;

namespace RizvizERP.API.Data
{
    /// <summary>
    /// Maps core HR entities to existing Accounting_System_UAT data.
    /// Run scripts/create-rizviz-bridge-views.sql in SSMS first.
    /// </summary>
    public static class UatSchemaConfiguration
    {
        public static bool IsEnabled { get; set; }
        public static bool UseBridgeViews { get; set; } = true;
        /// <summary>When true, interviews are read from dbo.Rizviz_Interviews_Live (mkt.* tables).</summary>
        public static bool UseLiveInterviewsView { get; set; } = true;
        /// <summary>When true, interviews use dbo.Rizviz_Interviews (Excel sync table) instead of live view.</summary>
        public static bool UseExcelSyncedInterviews { get; set; }
        /// <summary>When true, projects are read from dbo.Rizviz_Projects_Live (mkt.Projects).</summary>
        public static bool UseLiveProjectsView { get; set; } = true;
        /// <summary>When true, assets are read from inventory.assets (UAT) via UatAssetDataQueries.</summary>
        public static bool UseLiveAssetsView { get; set; } = true;

        public static void Apply(ModelBuilder modelBuilder, bool useBridgeViews)
        {
            if (useBridgeViews)
            {
                modelBuilder.Entity<Company>().ToTable("Rizviz_Companies", "dbo");
                modelBuilder.Entity<Branch>().ToTable("Rizviz_Branches", "dbo");
                modelBuilder.Entity<Employee>().ToTable("Rizviz_Employees", "dbo");
            }
            else
            {
                modelBuilder.Entity<Company>().ToTable("Company", "dbo");
                modelBuilder.Entity<Branch>().ToTable("Company_branches", "dbo");
                modelBuilder.Entity<Employee>().ToTable("entity", "hrms");
            }

            // ERP-only features live in dbo.Rizviz_* tables (see create-rizviz-app-tables.sql)
            modelBuilder.Entity<User>().ToTable("Rizviz_Users", "dbo");
            modelBuilder.Entity<DropdownValue>().ToTable("Rizviz_DropdownValues", "dbo");
            if (IsEnabled && UseExcelSyncedInterviews)
                modelBuilder.Entity<Interview>().ToTable("Rizviz_Interviews", "dbo");
            else if (IsEnabled && UseLiveInterviewsView)
                modelBuilder.Entity<Interview>().ToView("Rizviz_Interviews_Live", "dbo");
            else
                modelBuilder.Entity<Interview>().ToTable("Rizviz_Interviews", "dbo");
            modelBuilder.Entity<Role>().ToTable("Rizviz_Roles", "dbo");
            modelBuilder.Entity<AuditLog>().ToTable("Rizviz_AuditLogs", "dbo");
            if (IsEnabled && UseLiveProjectsView)
                modelBuilder.Entity<Project>().ToView("Rizviz_Projects_Live", "dbo");
            else
                modelBuilder.Entity<Project>().ToTable("Rizviz_Projects", "dbo");
            if (IsEnabled && UseLiveAssetsView)
                modelBuilder.Entity<Asset>().ToView("Rizviz_Assets_Live", "dbo");
            else
                modelBuilder.Entity<Asset>().ToTable("Rizviz_Assets", "dbo");
            modelBuilder.Entity<JobPosting>().ToTable("Rizviz_JobPostings", "dbo");
            modelBuilder.Entity<Candidate>().ToTable("Rizviz_Candidates", "dbo");
            modelBuilder.Entity<PayrollProcess>().ToTable("Rizviz_PayrollProcesses", "dbo");
            modelBuilder.Entity<PayrollDetail>().ToTable("Rizviz_PayrollDetails", "dbo");
        }
    }
}
