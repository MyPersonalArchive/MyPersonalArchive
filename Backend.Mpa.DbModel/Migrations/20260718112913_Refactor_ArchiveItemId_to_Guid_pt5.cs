using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Mpa.DbModel.Migrations
{
    /// <inheritdoc />
    public partial class Refactor_ArchiveItemId_to_Guid_pt5 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "ArchiveItemGuid",
                table: "Blob",
                type: "TEXT COLLATE NOCASE",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "ArchiveItemGuid",
                table: "ArchiveItemAndTag",
                type: "TEXT COLLATE NOCASE",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<Guid>(
                name: "Guid",
                table: "ArchiveItem",
                type: "TEXT COLLATE NOCASE",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "TEXT");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "ArchiveItemGuid",
                table: "Blob",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "TEXT COLLATE NOCASE",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "ArchiveItemGuid",
                table: "ArchiveItemAndTag",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "TEXT COLLATE NOCASE");

            migrationBuilder.AlterColumn<Guid>(
                name: "Guid",
                table: "ArchiveItem",
                type: "TEXT",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "TEXT COLLATE NOCASE");
        }
    }
}
