using Microsoft.EntityFrameworkCore;
using RizvizERP.API.Models;

namespace RizvizERP.API.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<Employee> Employees { get; set; }
        public DbSet<Address> Addresses { get; set; }
        public DbSet<EmergencyContact> EmergencyContacts { get; set; }
        public DbSet<BloodRelation> BloodRelations { get; set; }
        public DbSet<HealthData> HealthRecords { get; set; }
        public DbSet<EmploymentHistory> EmploymentHistories { get; set; }
        public DbSet<Education> EducationRecords { get; set; }
        public DbSet<Document> Documents { get; set; }
        public DbSet<HrLetter> HrLetters { get; set; }
        public DbSet<BankInfo> BankInformations { get; set; }
        public DbSet<DepartmentTeam> DepartmentTeams { get; set; }
        public DbSet<EmployeeProject> EmployeeProjects { get; set; }
        public DbSet<OtherIncome> OtherIncomes { get; set; }
        public DbSet<LoanAdvance> LoansAdvances { get; set; }
        public DbSet<SalaryHistory> SalaryHistories { get; set; }
        public DbSet<LineManagerHistory> LineManagerHistories { get; set; }
        public DbSet<FunctionalRoleHistory> FunctionalRoleHistories { get; set; }
        public DbSet<SalaryIncrement> SalaryIncrements { get; set; }
        public DbSet<Asset> Assets { get; set; }
        public DbSet<AssetAssignment> AssetAssignments { get; set; }
        public DbSet<Project> Projects { get; set; }
        public DbSet<JobPosting> JobPostings { get; set; }
        public DbSet<Candidate> Candidates { get; set; }
        public DbSet<Interview> Interviews { get; set; }
        public DbSet<InterviewHistory> InterviewHistory { get; set; }
        public DbSet<InterviewSyncLog> InterviewSyncLogs { get; set; }
        public DbSet<PayrollProcess> PayrollProcesses { get; set; }
        public DbSet<PayrollDetail> PayrollDetails { get; set; }
        public DbSet<Company> Companies { get; set; }
        public DbSet<Branch> Branches { get; set; }
        public DbSet<DropdownValue> DropdownValues { get; set; }
        public DbSet<Lead> Leads { get; set; }
        public DbSet<InterviewFeedback> InterviewFeedbacks { get; set; }
        public DbSet<GeneralFeedback> GeneralFeedbacks { get; set; }


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            if (UatSchemaConfiguration.IsEnabled)
            {
                UatSchemaConfiguration.Apply(modelBuilder, UatSchemaConfiguration.UseBridgeViews);
            }

            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                foreach (var property in entityType.GetProperties())
                {
                    if (property.ClrType == typeof(decimal) || property.ClrType == typeof(decimal?))
                    {
                        property.SetPrecision(18);
                        property.SetScale(2);
                    }
                }
            }

            // Configure one-to-one relationship
            modelBuilder.Entity<Employee>()
                .HasOne(e => e.BankInformation)
                .WithOne()
                .HasForeignKey<BankInfo>(b => b.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure one-to-many relationships
            modelBuilder.Entity<Employee>()
                .HasMany(e => e.Addresses)
                .WithOne()
                .HasForeignKey(a => a.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Employee>()
                .HasMany(e => e.EmergencyContacts)
                .WithOne()
                .HasForeignKey(ec => ec.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Employee>()
                .HasMany(e => e.BloodRelations)
                .WithOne()
                .HasForeignKey(br => br.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Employee>()
                .HasMany(e => e.HealthRecords)
                .WithOne()
                .HasForeignKey(h => h.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Employee>()
                .HasMany(e => e.EmploymentHistories)
                .WithOne()
                .HasForeignKey(eh => eh.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Employee>()
                .HasMany(e => e.EducationRecords)
                .WithOne()
                .HasForeignKey(ed => ed.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Employee>()
                .HasMany(e => e.Documents)
                .WithOne()
                .HasForeignKey(d => d.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Employee>()
                .HasMany(e => e.HrLetters)
                .WithOne()
                .HasForeignKey(l => l.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Employee>()
                .HasMany(e => e.DepartmentTeams)
                .WithOne()
                .HasForeignKey(dt => dt.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Employee>()
                .HasMany(e => e.Projects)
                .WithOne()
                .HasForeignKey(ep => ep.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Employee>()
                .HasMany(e => e.OtherIncomes)
                .WithOne()
                .HasForeignKey(oi => oi.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Employee>()
                .HasMany(e => e.LoansAdvances)
                .WithOne()
                .HasForeignKey(la => la.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Employee>()
                .HasMany(e => e.SalaryHistories)
                .WithOne()
                .HasForeignKey(sh => sh.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Employee>()
                .HasMany(e => e.LineManagerHistories)
                .WithOne()
                .HasForeignKey(lmh => lmh.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Employee>()
                .HasMany(e => e.FunctionalRoleHistories)
                .WithOne()
                .HasForeignKey(frh => frh.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Employee>()
                .HasMany(e => e.SalaryIncrements)
                .WithOne()
                .HasForeignKey(si => si.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
