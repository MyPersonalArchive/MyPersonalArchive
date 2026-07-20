using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Mpa.DbModel.Migrations
{
	/// <inheritdoc />
	public partial class Refactor_ArchiveItemId_to_Guid_pt2 : Migration
	{
		/// <inheritdoc />
		protected override void Up(MigrationBuilder migrationBuilder)
		{
			migrationBuilder.AddColumn<Guid>(
				name: "ArchiveItemGuid",
				table: "Blob",
				type: "TEXT",
				nullable: true);

			migrationBuilder.Sql(@"
				UPDATE Blob
				SET ArchiveItemGuid = (
					SELECT Guid
					FROM ArchiveItem
					WHERE ArchiveItem.Id = Blob.ArchiveItemId
				)
			");

			migrationBuilder.AddColumn<Guid>(
				name: "ArchiveItemGuid",
				table: "ArchiveItemAndTag",
				type: "TEXT",
				nullable: false,
				defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

			migrationBuilder.Sql(@"
				UPDATE ArchiveItemAndTag
				SET ArchiveItemGuid = (
					SELECT Guid
					FROM ArchiveItem
					WHERE ArchiveItem.Id = ArchiveItemAndTag.ArchiveItemId
				)
			");
		}

		/// <inheritdoc />
		protected override void Down(MigrationBuilder migrationBuilder)
		{
			migrationBuilder.DropColumn(
				name: "ArchiveItemGuid",
				table: "Blob");

			migrationBuilder.DropColumn(
				name: "ArchiveItemGuid",
				table: "ArchiveItemAndTag");
		}
	}
}
