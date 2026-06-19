using System;
using System.IO;
using System.Text;
using System.Linq;
using RizvizERP.API.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using RizvizERP.API.Services;
using RizvizERP.API.Configuration;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using RizvizERP.API.Data;

namespace RizvizERP.API
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        private bool CanConnectToSqlServer()
        {
            var connectionString = Configuration.GetConnectionString("DefaultConnection");
            if (string.IsNullOrWhiteSpace(connectionString)) return false;

            try
            {
                using var connection = new SqlConnection(connectionString);
                connection.Open();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Startup] SQL connection test failed: {ex.Message}");
                return false;
            }
        }

        public void ConfigureServices(IServiceCollection services)
        {
            // Configure CORS — allow localhost dev + deployed Vercel frontend
            services.AddCors(options =>
            {
                options.AddPolicy("CorsPolicy", policy =>
                {
                    var allowedOrigins = Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? new[]
                    {
                        "http://localhost:3000",
                        "http://localhost:3001",
                        "https://rizviz-interviews-portal.vercel.app"
                    };
                    policy.WithOrigins(allowedOrigins)
                          .AllowAnyMethod()
                          .AllowAnyHeader()
                          .AllowCredentials();
                });
            });

            var useInMemory = Configuration.GetValue<bool>("DatabaseSettings:UseInMemoryDatabase");
            var fallbackToInMemory = Configuration.GetValue<bool>("DatabaseSettings:FallbackToInMemoryOnSqlFailure", true);

            services.Configure<InterviewSyncSettings>(Configuration.GetSection(InterviewSyncSettings.SectionName));

            if (!useInMemory && fallbackToInMemory && !CanConnectToSqlServer())
            {
                Console.WriteLine("[Startup] SQL Server is not reachable (service stopped or crashed). Using in-memory database so the app can run.");
                Console.WriteLine("[Startup] Fix SQL Server, then set DatabaseSettings:FallbackToInMemoryOnSqlFailure to false and restart.");
                useInMemory = true;
            }

            if (useInMemory)
            {
                // Register InMemory DbContext for endpoints that bypass MockServices (like Interviews)
                services.AddDbContext<ApplicationDbContext>(options =>
                    options.UseInMemoryDatabase("RizvizMockDb"));

                // Register Mock Services as Singletons (shared memory state)
                services.AddSingleton<MockServices>();
                services.AddSingleton<IAuthService>(sp => sp.GetRequiredService<MockServices>());
                services.AddSingleton<IEmployeeService>(sp => sp.GetRequiredService<MockServices>());
                services.AddSingleton<IPayrollService>(sp => sp.GetRequiredService<MockServices>());
                services.AddSingleton<IInventoryService>(sp => sp.GetRequiredService<MockServices>());
                services.AddSingleton<IProjectService>(sp => sp.GetRequiredService<MockServices>());
                services.AddSingleton<IRecruitmentService>(sp => sp.GetRequiredService<MockServices>());
                services.AddSingleton<IDashboardService>(sp => sp.GetRequiredService<MockServices>());
                services.AddSingleton<ISetupService>(sp => sp.GetRequiredService<MockServices>());
            }
            else
            {
                var useUatSchema = Configuration.GetValue<bool>("DatabaseSettings:UseExistingUatSchema");
                UatSchemaConfiguration.IsEnabled = useUatSchema;
                UatSchemaConfiguration.UseBridgeViews = Configuration.GetValue<bool>("DatabaseSettings:UseBridgeViews", true);
                var interviewSync = Configuration.GetSection(InterviewSyncSettings.SectionName)
                    .Get<InterviewSyncSettings>() ?? new InterviewSyncSettings();

                UatSchemaConfiguration.UseLiveInterviewsView = Configuration.GetValue<bool>("DatabaseSettings:UseLiveInterviewsView", true);
                UatSchemaConfiguration.UseLiveProjectsView = Configuration.GetValue<bool>("DatabaseSettings:UseLiveProjectsView", true);
                UatSchemaConfiguration.UseLiveAssetsView = Configuration.GetValue<bool>("DatabaseSettings:UseLiveAssetsView", true);
                UatSchemaConfiguration.UseExcelSyncedInterviews =
                    useUatSchema && interviewSync.UseSyncedDataForApi;
                if (UatSchemaConfiguration.UseExcelSyncedInterviews)
                    UatSchemaConfiguration.UseLiveInterviewsView = false;

                services.AddDbContext<ApplicationDbContext>(options =>
                    options.UseSqlServer(Configuration.GetConnectionString("DefaultConnection")));

                // Auto-sync background poller is always registered — it uses file-timestamp
                // comparison to skip polling cycles when Excel hasn't changed.
                services.AddHostedService<InterviewSyncBackgroundService>();

                // Register Database-backed Services as Scoped
                services.AddScoped<DatabaseServices>();
                services.AddScoped<IAuthService>(sp => sp.GetRequiredService<DatabaseServices>());
                services.AddScoped<IEmployeeService>(sp => sp.GetRequiredService<DatabaseServices>());
                services.AddScoped<IPayrollService>(sp => sp.GetRequiredService<DatabaseServices>());
                services.AddScoped<IInventoryService>(sp => sp.GetRequiredService<DatabaseServices>());
                services.AddScoped<IProjectService>(sp => sp.GetRequiredService<DatabaseServices>());
                services.AddScoped<IRecruitmentService>(sp => sp.GetRequiredService<DatabaseServices>());
                services.AddScoped<IDashboardService>(sp => sp.GetRequiredService<DatabaseServices>());
                services.AddScoped<ISetupService>(sp => sp.GetRequiredService<DatabaseServices>());
            }

            services.AddScoped<ISyncInterviewDataService, SyncInterviewDataService>();
            services.AddSignalR();
            services.AddScoped<NotificationService>();
            services.AddHttpClient(); // For FeedbackController → OpenAI Whisper/GPT

            // ── General Feedback (DB + Google Sheets) ─────────────────────────
            services.AddScoped<RizvizERP.API.Repositories.IGeneralFeedbackRepository,
                               RizvizERP.API.Repositories.GeneralFeedbackRepository>();
            services.AddSingleton<IGoogleSheetsService, GoogleSheetsService>();

            // ── Startup sync: Google Sheets → DB (runs every restart) ─────────
            services.AddHostedService<FeedbackSyncService>();

            services.AddControllers()
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.PropertyNamingPolicy = null;
                });

            // Setup Swagger
            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo
                {
                    Title = "RizvizERP API",
                    Version = "v1",
                    Description = @"**RizvizERP REST API** — Enterprise Resource Planning System for Rizviz Int. Impex.

## Test Credentials
| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |
| hr | hr123 | HR Manager |
| manager | mgr123 | Manager |
| employee | emp123 | Employee |

## How to authenticate
1. POST `/api/auth/login` with `companyCode: ""RII""`, `branchCode: ""LHE""`, `username`, `password`
2. Copy the `token` from the response
3. Click the **Authorize** button above and paste: `Bearer {your-token}`
4. All protected endpoints will now work.",
                    Contact = new OpenApiContact
                    {
                        Name = "Rizviz ERP Dev Team",
                        Email = "dev@rizviz.com"
                    }
                });

                // Add JWT authentication schema in Swagger
                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Description = "JWT Authorization. Enter: **Bearer {your-token}**",
                    Name = "Authorization",
                    In = ParameterLocation.Header,
                    Type = SecuritySchemeType.ApiKey,
                    Scheme = "Bearer"
                });

                c.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                        },
                        new string[] {}
                    }
                });
            });

            // Configure JWT Authentication
            var secretKey = Configuration["JWT:Secret"] ?? "super_secret_key_rizviz_erp_2026_system_security_generation";
            var issuer = Configuration["JWT:Issuer"] ?? "RizvizERP";
            var audience = Configuration["JWT:Audience"] ?? "RizvizERPClient";

            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = issuer,
                    ValidAudience = audience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
                    ClockSkew = TimeSpan.Zero
                };
            });
        }

        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment() || true) // Enable Swagger in production/testing as well
            {
                app.UseDeveloperExceptionPage();
                app.UseSwagger();
                app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "RizvizERP.API v1"));
            }

            // app.UseHttpsRedirection(); // Removed to prevent CORS preflight redirects from HTTP to HTTPS locally

            app.UseCors("CorsPolicy");

            app.UseStaticFiles(); // Serves wwwroot (audio-uploads folder)

            app.UseRouting();

            app.UseAuthentication();
            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
                endpoints.MapHub<RizvizERP.API.Hubs.NotificationHub>("/hubs/notifications");
            });

            // Auto-seed Interviews if empty (never block API startup)
            try
            {
                using var serviceScope = app.ApplicationServices.GetService<IServiceScopeFactory>().CreateScope();
                var context = serviceScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

                if (context.Database.IsInMemory())
                {
                    context.Database.EnsureCreated();
                }
                else if (context.Database.CanConnect())
                {
                    var createTableSql = @"
                        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[leads]') AND type in (N'U'))
                        BEGIN
                            CREATE TABLE [dbo].[leads] (
                                [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                                [company_name] NVARCHAR(255) NOT NULL,
                                [status] NVARCHAR(100) NULL,
                                [entertains] NVARCHAR(500) NULL,
                                [bd_closer] NVARCHAR(500) NULL,
                                [is_converted] BIT NOT NULL DEFAULT 0,
                                [rounds] INT NULL,
                                [last_activity] DATE NULL,
                                [is_manual] BIT NOT NULL DEFAULT 0,
                                [notes] NVARCHAR(2000) NULL,
                                [created_at] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                                [updated_at] DATETIME2 NOT NULL DEFAULT GETUTCDATE()
                            );
                        END
                    ";
                    context.Database.ExecuteSqlRaw(createTableSql);

                    // Create interview_feedback table
                    var feedbackTableSql = @"
                        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[interview_feedback]') AND type in (N'U'))
                        BEGIN
                            CREATE TABLE [dbo].[interview_feedback] (
                                [id]               INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                                [interviewer_name] NVARCHAR(255) NULL,
                                [interviewee_name] NVARCHAR(255) NULL,
                                [company_name]     NVARCHAR(255) NULL,
                                [interview_type]   NVARCHAR(100) NULL,
                                [interview_date]   DATE NULL,
                                [audio_file_url]   NVARCHAR(500) NULL,
                                [urdu_transcript]  NVARCHAR(MAX) NULL,
                                [english_feedback] NVARCHAR(MAX) NULL,
                                [communication]    NVARCHAR(MAX) NULL,
                                [technical_skills] NVARCHAR(MAX) NULL,
                                [strengths]        NVARCHAR(MAX) NULL,
                                [weaknesses]       NVARCHAR(MAX) NULL,
                                [recommendation]   NVARCHAR(50) NULL,
                                [created_at]       DATETIME2 NOT NULL DEFAULT GETUTCDATE()
                            );
                        END
                    ";
                    context.Database.ExecuteSqlRaw(feedbackTableSql);
                }

                if (!context.Database.CanConnect())
                {
                    Console.WriteLine("[Seeder] Database not reachable — skipping auto-seed.");
                }
                else if (Configuration.GetValue<bool>("DatabaseSettings:AutoSeedInterviewsOnStartup", false)
                         && !context.Interviews.Any())
                {
                    var filePath = Path.Combine(Directory.GetCurrentDirectory(), "..", "interviews_seed.csv");
                    if (!File.Exists(filePath))
                    {
                        Console.WriteLine("[Seeder] interviews_seed.csv not found — skipping.");
                    }
                    else
                    {
                        var parsedRows = Controllers.SeedHelper.ParseCsvParsed(filePath);
                        var count = 0;
                        foreach (var parsed in parsedRows)
                        {
                            var interview = Controllers.SeedHelper.MapParsedRow(parsed);
                            if (string.IsNullOrWhiteSpace(interview.IntervieweeName)) continue;
                            context.Interviews.Add(interview);
                            count++;
                        }
                        if (count > 0)
                        {
                            context.SaveChanges();
                            Console.WriteLine($"[Seeder] Seeded {count} interviews into dbo.Rizviz_Interviews.");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Seeder] Skipped auto-seed: {ex.Message}");
                Console.WriteLine("[Seeder] Run scripts/create-rizviz-app-tables.sql in SSMS if Rizviz_Interviews columns are wrong.");
            }
        }
    }
}
