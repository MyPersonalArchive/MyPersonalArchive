using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Mpa.DbModel.Migrations
{
	/// <inheritdoc />
	public partial class Refactor_Blob_table_pt_2 : Migration
	{
		/// <inheritdoc />
		protected override void Up(MigrationBuilder migrationBuilder)
		{
			migrationBuilder.DropUniqueConstraint(
				name: "AK_Blob_Id_TenantId",
				table: "Blob");

			migrationBuilder.DropColumn(
				name: "Id",
				table: "Blob");

			migrationBuilder.RenameColumn(
				name: "Guid",
				table: "Blob",
				newName: "Id");

			migrationBuilder.AddUniqueConstraint(
				name: "AK_Blob_Id_TenantId",
				table: "Blob",
				columns: new[] { "Id", "TenantId" });
		}

		/// <inheritdoc />
		protected override void Down(MigrationBuilder migrationBuilder)
		{
			migrationBuilder.DropUniqueConstraint(
				name: "AK_Blob_Id_TenantId",
				table: "Blob");

			migrationBuilder.RenameColumn(
				name: "Id",
				table: "Blob",
				newName: "Guid");

			migrationBuilder.AddColumn<int>(
							name: "Id",
							table: "Blob",
							type: "INTEGER",
							nullable: false,
							defaultValue: 0)
							.Annotation("Sqlite:Autoincrement", true);

			migrationBuilder.AddUniqueConstraint(
							name: "AK_Blob_Id_TenantId",
							table: "Blob",
							columns: new[] { "Id", "TenantId" });
		}
	}
}
