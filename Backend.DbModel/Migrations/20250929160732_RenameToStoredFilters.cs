using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.DbModel.Migrations
{
	/// <inheritdoc />
	public partial class RenameToStoredFilters : Migration
	{
		/// <inheritdoc />
		protected override void Up(MigrationBuilder migrationBuilder)
		{
			migrationBuilder.RenameTable(
				name: "PredefinedSearches",
				newName: "StoredFilters");

			migrationBuilder.DropPrimaryKey(
				name: "PK_PredefinedSearches",
				table: "StoredFilters");
			migrationBuilder.AddPrimaryKey(
				name: "PK_StoredFilters",
				table: "StoredFilters",
				column: "Id");

			//TODO: Ensure SqlLite autincrement still works

			// ---
			// migrationBuilder.DropTable(
			// 	name: "PredefinedSearches");

			// migrationBuilder.CreateTable(
			// 	name: "StoredFilters",
			// 	columns: table => new
			// 	{
			// 		Id = table.Column<int>(type: "INTEGER", nullable: false)
			// 			.Annotation("Sqlite:Autoincrement", true),
			// 		Name = table.Column<string>(type: "TEXT", nullable: false),
			// 		Title = table.Column<string>(type: "TEXT", nullable: true),
			// 		Tags = table.Column<string>(type: "TEXT", nullable: true),
			// 		MetadataTypes = table.Column<string>(type: "TEXT", nullable: true),
			// 		TenantId = table.Column<int>(type: "INTEGER", nullable: false)
			// 	},
			// 	constraints: table =>
			// 	{
			// 		table.PrimaryKey("PK_StoredFilters", x => x.Id);
			// 	});
		}

		/// <inheritdoc />
		protected override void Down(MigrationBuilder migrationBuilder)
		{
			migrationBuilder.RenameTable(
				name: "PredefinedSearches",
				newName: "StoredFilters");

			migrationBuilder.DropPrimaryKey(
				name: "PK_PredefinedSearches",
				table: "StoredFilters");
			migrationBuilder.AddPrimaryKey(
				name: "PK_StoredFilters",
				table: "StoredFilters",
				column: "Id");

			// migrationBuilder.DropTable(
			// 	name: "StoredFilters");

			// migrationBuilder.CreateTable(
			// 	name: "PredefinedSearches",
			// 	columns: table => new
			// 	{
			// 		Id = table.Column<int>(type: "INTEGER", nullable: false)
			// 			.Annotation("Sqlite:Autoincrement", true),
			// 		MetadataTypes = table.Column<string>(type: "TEXT", nullable: true),
			// 		Name = table.Column<string>(type: "TEXT", nullable: false),
			// 		Tags = table.Column<string>(type: "TEXT", nullable: true),
			// 		TenantId = table.Column<int>(type: "INTEGER", nullable: false),
			// 		Title = table.Column<string>(type: "TEXT", nullable: true)
			// 	},
			// 	constraints: table =>
			// 	{
			// 		table.PrimaryKey("PK_PredefinedSearches", x => x.Id);
			// 	});
		}
	}
}
