using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Mpa.DbModel.Migrations
{
    /// <inheritdoc />
    public partial class Refactor_ArchiveItemId_to_Guid_pt1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "Guid",
                table: "ArchiveItem",
                type: "TEXT",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

			migrationBuilder.Sql(@"
				UPDATE ArchiveItem
				SET Guid = (
					lower(hex(randomblob(4))) || '-' ||
					lower(hex(randomblob(2))) || '-' ||
					'4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
					substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
					lower(hex(randomblob(6)))
				)
			");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Guid",
                table: "ArchiveItem");
        }
    }
}
