using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Mpa.DbModel.Migrations
{
    /// <inheritdoc />
    public partial class Make_HashedPassword_and_Salt_Nullable_forexternal_logins : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<byte[]>(
                name: "Salt",
                table: "User",
                type: "BLOB",
                maxLength: 16,
                nullable: true,
                oldClrType: typeof(byte[]),
                oldType: "BLOB",
                oldMaxLength: 16);

            migrationBuilder.AlterColumn<byte[]>(
                name: "HashedPassword",
                table: "User",
                type: "BLOB",
                maxLength: 32,
                nullable: true,
                oldClrType: typeof(byte[]),
                oldType: "BLOB",
                oldMaxLength: 32);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<byte[]>(
                name: "Salt",
                table: "User",
                type: "BLOB",
                maxLength: 16,
                nullable: false,
                defaultValue: new byte[0],
                oldClrType: typeof(byte[]),
                oldType: "BLOB",
                oldMaxLength: 16,
                oldNullable: true);

            migrationBuilder.AlterColumn<byte[]>(
                name: "HashedPassword",
                table: "User",
                type: "BLOB",
                maxLength: 32,
                nullable: false,
                defaultValue: new byte[0],
                oldClrType: typeof(byte[]),
                oldType: "BLOB",
                oldMaxLength: 32,
                oldNullable: true);
        }
    }
}
