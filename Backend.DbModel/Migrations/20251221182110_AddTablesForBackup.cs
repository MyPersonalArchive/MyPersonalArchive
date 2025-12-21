using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.DbModel.Migrations
{
	/// <inheritdoc />
	public partial class AddTablesForBackup : Migration
	{
		/// <inheritdoc />
		protected override void Up(MigrationBuilder migrationBuilder)
		{
			migrationBuilder.CreateTable(
				name: "BackupDestination",
				columns: table => new
				{
					Id = table.Column<int>(type: "INTEGER", nullable: false)
						.Annotation("Sqlite:Autoincrement", true),
					Title = table.Column<string>(type: "TEXT", nullable: false),
					Metadata = table.Column<string>(type: "TEXT", nullable: false),
					TenantId = table.Column<int>(type: "INTEGER", nullable: false)
				},
				constraints: table =>
				{
					table.PrimaryKey("PK_BackupDestination", x => x.Id);
				});

			migrationBuilder.CreateTable(
				name: "BackupHistory",
				columns: table => new
				{
					Id = table.Column<int>(type: "INTEGER", nullable: false)
						.Annotation("Sqlite:Autoincrement", true),
					StartedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
					CompletedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
					BackupDestinationId = table.Column<int>(type: "INTEGER", nullable: false),
					Status = table.Column<int>(type: "INTEGER", nullable: false),
					LogPath = table.Column<string>(type: "TEXT", nullable: false),
					TenantId = table.Column<int>(type: "INTEGER", nullable: false)
				},
				constraints: table =>
				{
					table.PrimaryKey("PK_BackupHistory", x => x.Id);
					table.ForeignKey(
						name: "FK_BackupHistory_BackupDestination_BackupDestinationId",
						column: x => x.BackupDestinationId,
						principalTable: "BackupDestination",
						principalColumn: "Id",
						onDelete: ReferentialAction.Cascade);
				});

			migrationBuilder.CreateIndex(
				name: "IX_BackupHistory_BackupDestinationId",
				table: "BackupHistory",
				column: "BackupDestinationId");
		}

		/// <inheritdoc />
		protected override void Down(MigrationBuilder migrationBuilder)
		{
			migrationBuilder.DropTable(
				name: "BackupHistory");

			migrationBuilder.DropTable(
				name: "BackupDestination");
		}
	}
}
