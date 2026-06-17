using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RizvizERP.API.Migrations
{
    /// <inheritdoc />
    public partial class AddGeneralFeedbackTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GeneralFeedbacks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(254)", maxLength: 254, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    Timestamp = table.Column<System.DateTime>(type: "datetime2", nullable: false,
                        defaultValueSql: "GETUTCDATE()"),
                    SheetSynced = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    SheetSyncedAt = table.Column<System.DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GeneralFeedbacks", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GeneralFeedbacks_Email",
                table: "GeneralFeedbacks",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_GeneralFeedbacks_Timestamp",
                table: "GeneralFeedbacks",
                column: "Timestamp");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "GeneralFeedbacks");
        }
    }
}
