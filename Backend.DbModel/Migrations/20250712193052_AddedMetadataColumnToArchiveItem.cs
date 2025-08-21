using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.DbModel.Migrations
{
    /// <inheritdoc />
    public partial class AddedMetadataColumnToArchiveItem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Metadata",
                table: "ArchiveItem",
                type: "TEXT",
                nullable: false,
                defaultValue: "{}");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Metadata",
                table: "ArchiveItem");
        }
    }
}
