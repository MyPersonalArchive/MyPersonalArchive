using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Backend.DbModel.Migrations
{
    /// <inheritdoc />
    public partial class RemovedStoredFilters : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StoredFilters");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StoredFilters",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    MetadataTypes = table.Column<string>(type: "TEXT", nullable: true),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Tags = table.Column<string>(type: "TEXT", nullable: true),
                    TenantId = table.Column<int>(type: "INTEGER", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StoredFilters", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "StoredFilters",
                columns: new[] { "Id", "MetadataTypes", "Name", "Tags", "TenantId", "Title" },
                values: new object[,]
                {
                    { -1, "[]", "No filters", "[]", -1, "" },
                    { 1, "[]", "No filters", "[]", -1, "" },
                    { 2, "[]", "No filters", "[]", -1, "" },
                    { 3, "[]", "No filters", "[]", -1, "" }
                });
        }
    }
}
