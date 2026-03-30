using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.DbModel.Migrations
{
    /// <inheritdoc />
    public partial class AddLastUpdatedToArchiveItem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LastUpdated",
                table: "ArchiveItem",
                type: "TEXT",
                nullable: false,
                defaultValue: DateTimeOffset.MinValue);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastUpdated",
                table: "ArchiveItem");
        }
    }
}
