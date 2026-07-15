using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Mpa.DbModel.Migrations
{
    /// <inheritdoc />
    public partial class Refactor_Blob_table_pt_1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FileHash",
                table: "Blob");

            migrationBuilder.DropColumn(
                name: "StoreRoot",
                table: "Blob");

			migrationBuilder.AddColumn<Guid>(
				name: "Guid",
				table: "Blob",
				type: "TEXT",
				nullable: true,
				defaultValue: Guid.NewGuid());

			// copy the guid from pathinstore to the new guid column
			migrationBuilder.Sql("UPDATE Blob SET Guid = substr(PathInStore, instr(PathInStore, '.') - 36, 36);");

			migrationBuilder.AlterColumn<Guid>(
				name: "Guid",
				table: "Blob",
				type: "TEXT",
				nullable: false,
				oldClrType: typeof(Guid),
				oldType: "TEXT",
				oldNullable: true);

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "StoreRoot",
                table: "Blob",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<byte[]>(
                name: "FileHash",
                table: "Blob",
                type: "BLOB",
                nullable: false,
                defaultValue: new byte[0]);
        }
    }
}
