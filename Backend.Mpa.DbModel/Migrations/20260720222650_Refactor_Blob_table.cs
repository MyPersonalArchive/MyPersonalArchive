using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Mpa.DbModel.Migrations
{
    /// <inheritdoc />
    public partial class Refactor_Blob_table : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Blob_User_UploadedByUsername",
                table: "Blob");

            migrationBuilder.DropIndex(
                name: "IX_Blob_UploadedByUsername",
                table: "Blob");

            migrationBuilder.DropColumn(
                name: "FileSize",
                table: "Blob");

            migrationBuilder.DropColumn(
                name: "OriginalFilename",
                table: "Blob");

            migrationBuilder.DropColumn(
                name: "PathInStore",
                table: "Blob");

            migrationBuilder.DropColumn(
                name: "UploadedAt",
                table: "Blob");

            migrationBuilder.DropColumn(
                name: "UploadedByUsername",
                table: "Blob");

            migrationBuilder.AlterColumn<Guid>(
                name: "ArchiveItemId",
                table: "Blob",
                type: "TEXT COLLATE NOCASE",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "TEXT COLLATE NOCASE",
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "ArchiveItemId",
                table: "Blob",
                type: "TEXT COLLATE NOCASE",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "TEXT COLLATE NOCASE");

            migrationBuilder.AddColumn<long>(
                name: "FileSize",
                table: "Blob",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<string>(
                name: "OriginalFilename",
                table: "Blob",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PathInStore",
                table: "Blob",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UploadedAt",
                table: "Blob",
                type: "TEXT",
                nullable: false,
                defaultValue: new DateTimeOffset(1, 1, 1, 0, 0, 0, TimeSpan.Zero));

            migrationBuilder.AddColumn<string>(
                name: "UploadedByUsername",
                table: "Blob",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Blob_UploadedByUsername",
                table: "Blob",
                column: "UploadedByUsername");

            migrationBuilder.AddForeignKey(
                name: "FK_Blob_User_UploadedByUsername",
                table: "Blob",
                column: "UploadedByUsername",
                principalTable: "User",
                principalColumn: "Username",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
