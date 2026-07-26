using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Mpa.DbModel.Migrations
{
    /// <inheritdoc />
    public partial class Remove_archiveItem_and__blob_tables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ArchiveItemAndTag");

            migrationBuilder.DropTable(
                name: "Blob");

            migrationBuilder.DropTable(
                name: "Tag");

            migrationBuilder.DropTable(
                name: "ArchiveItem");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ArchiveItem",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT COLLATE NOCASE", nullable: false),
                    CreatedByUsername = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    DocumentDate = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                    LastUpdated = table.Column<DateTimeOffset>(type: "TEXT", nullable: false, defaultValueSql: "datetime('now')"),
                    Metadata = table.Column<string>(type: "TEXT", nullable: false),
                    TenantId = table.Column<int>(type: "INTEGER", nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ArchiveItem", x => x.Id);
                    table.UniqueConstraint("AK_ArchiveItem_Id_TenantId", x => new { x.Id, x.TenantId });
                    table.ForeignKey(
                        name: "FK_ArchiveItem_User_CreatedByUsername",
                        column: x => x.CreatedByUsername,
                        principalTable: "User",
                        principalColumn: "Username",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Tag",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    TenantId = table.Column<int>(type: "INTEGER", nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tag", x => x.Id);
                    table.UniqueConstraint("AK_Tag_Id_TenantId", x => new { x.Id, x.TenantId });
                });

            migrationBuilder.CreateTable(
                name: "Blob",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false),
                    ArchiveItemId = table.Column<Guid>(type: "TEXT COLLATE NOCASE", nullable: false),
                    ArchiveItemTenantId = table.Column<int>(type: "INTEGER", nullable: true),
                    MimeType = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    PageCount = table.Column<int>(type: "INTEGER", nullable: false),
                    TenantId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Blob", x => x.Id);
                    table.UniqueConstraint("AK_Blob_Id_TenantId", x => new { x.Id, x.TenantId });
                    table.ForeignKey(
                        name: "FK_Blob_ArchiveItem_ArchiveItemId_ArchiveItemTenantId",
                        columns: x => new { x.ArchiveItemId, x.ArchiveItemTenantId },
                        principalTable: "ArchiveItem",
                        principalColumns: new[] { "Id", "TenantId" });
                });

            migrationBuilder.CreateTable(
                name: "ArchiveItemAndTag",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ArchiveItemId = table.Column<Guid>(type: "TEXT COLLATE NOCASE", nullable: false),
                    TagId = table.Column<int>(type: "INTEGER", nullable: false),
                    TenantId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ArchiveItemAndTag", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ArchiveItemAndTag_ArchiveItem_ArchiveItemId_TenantId",
                        columns: x => new { x.ArchiveItemId, x.TenantId },
                        principalTable: "ArchiveItem",
                        principalColumns: new[] { "Id", "TenantId" },
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ArchiveItemAndTag_Tag_TagId_TenantId",
                        columns: x => new { x.TagId, x.TenantId },
                        principalTable: "Tag",
                        principalColumns: new[] { "Id", "TenantId" },
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ArchiveItem_CreatedByUsername",
                table: "ArchiveItem",
                column: "CreatedByUsername");

            migrationBuilder.CreateIndex(
                name: "IX_ArchiveItemAndTag_ArchiveItemId_TagId",
                table: "ArchiveItemAndTag",
                columns: new[] { "ArchiveItemId", "TagId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ArchiveItemAndTag_ArchiveItemId_TenantId",
                table: "ArchiveItemAndTag",
                columns: new[] { "ArchiveItemId", "TenantId" });

            migrationBuilder.CreateIndex(
                name: "IX_ArchiveItemAndTag_TagId_TenantId",
                table: "ArchiveItemAndTag",
                columns: new[] { "TagId", "TenantId" });

            migrationBuilder.CreateIndex(
                name: "IX_Blob_ArchiveItemId_ArchiveItemTenantId",
                table: "Blob",
                columns: new[] { "ArchiveItemId", "ArchiveItemTenantId" });

            migrationBuilder.CreateIndex(
                name: "IX_Tag_Title_TenantId",
                table: "Tag",
                columns: new[] { "Title", "TenantId" },
                unique: true);
        }
    }
}
