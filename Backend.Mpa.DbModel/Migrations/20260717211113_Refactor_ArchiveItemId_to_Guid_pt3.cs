using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Mpa.DbModel.Migrations
{
    /// <inheritdoc />
    public partial class Refactor_ArchiveItemId_to_Guid_pt3 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddUniqueConstraint(
                name: "AK_ArchiveItem_Guid_TenantId",
                table: "ArchiveItem",
                columns: new[] { "Guid", "TenantId" });

            migrationBuilder.DropPrimaryKey(
                name: "PK_ArchiveItem",
                table: "ArchiveItem");

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "ArchiveItem",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER")
                .OldAnnotation("Sqlite:Autoincrement", true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_ArchiveItem",
                table: "ArchiveItem",
                column: "Guid");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_ArchiveItem",
                table: "ArchiveItem");

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "ArchiveItem",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER")
                .Annotation("Sqlite:Autoincrement", true);

            migrationBuilder.DropUniqueConstraint(
                name: "AK_ArchiveItem_Guid_TenantId",
                table: "ArchiveItem");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ArchiveItem",
                table: "ArchiveItem",
                column: "Id");
        }
    }
}
