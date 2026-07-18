using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Mpa.DbModel.Migrations
{
    /// <inheritdoc />
    public partial class Refactor_ArchiveItemId_to_Guid_pt6 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Id",
                table: "ArchiveItem");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Id",
                table: "ArchiveItem",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }
    }
}
