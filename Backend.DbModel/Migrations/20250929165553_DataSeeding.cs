using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Backend.DbModel.Migrations
{
    /// <inheritdoc />
    public partial class DataSeeding : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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

            migrationBuilder.UpdateData(
                table: "User",
                keyColumn: "Id",
                keyValue: 1,
                column: "Fullname",
                value: "Administrator");

            migrationBuilder.UpdateData(
                table: "User",
                keyColumn: "Id",
                keyValue: 2,
                column: "Fullname",
                value: "Arjan");

            migrationBuilder.UpdateData(
                table: "User",
                keyColumn: "Id",
                keyValue: 3,
                column: "Fullname",
                value: "Stian");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "StoredFilters",
                keyColumn: "Id",
                keyValue: -1);

            migrationBuilder.DeleteData(
                table: "StoredFilters",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "StoredFilters",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "StoredFilters",
                keyColumn: "Id",
                keyValue: 3);

            migrationBuilder.UpdateData(
                table: "User",
                keyColumn: "Id",
                keyValue: 1,
                column: "Fullname",
                value: "administrator");

            migrationBuilder.UpdateData(
                table: "User",
                keyColumn: "Id",
                keyValue: 2,
                column: "Fullname",
                value: "administrator");

            migrationBuilder.UpdateData(
                table: "User",
                keyColumn: "Id",
                keyValue: 3,
                column: "Fullname",
                value: "administrator");
        }
    }
}
