using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Backend.DbModel.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Tag",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Title = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    TenantId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tag", x => x.Id);
                    table.UniqueConstraint("AK_Tag_Id_TenantId", x => new { x.Id, x.TenantId });
                });

            migrationBuilder.CreateTable(
                name: "Tenant",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Title = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tenant", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "User",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Username = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    Fullname = table.Column<string>(type: "TEXT", maxLength: 400, nullable: false),
                    HashedPassword = table.Column<byte[]>(type: "BLOB", maxLength: 32, nullable: false),
                    Salt = table.Column<byte[]>(type: "BLOB", maxLength: 16, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_User", x => x.Id);
                    table.UniqueConstraint("AK_User_Username", x => x.Username);
                });

            migrationBuilder.CreateTable(
                name: "ArchiveItem",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Title = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    CreatedByUsername = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    TenantId = table.Column<int>(type: "INTEGER", nullable: false)
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
                name: "Token",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Username = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    RefreshToken = table.Column<string>(type: "TEXT", maxLength: 44, nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Token", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Token_User_Username",
                        column: x => x.Username,
                        principalTable: "User",
                        principalColumn: "Username",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserTenant",
                columns: table => new
                {
                    TenantId = table.Column<int>(type: "INTEGER", nullable: false),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserTenant", x => new { x.TenantId, x.UserId });
                    table.ForeignKey(
                        name: "FK_UserTenant_Tenant_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserTenant_User_UserId",
                        column: x => x.UserId,
                        principalTable: "User",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ArchiveItemAndTag",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ArchiveItemId = table.Column<int>(type: "INTEGER", nullable: false),
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

            migrationBuilder.CreateTable(
                name: "Blob",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    PathInStore = table.Column<string>(type: "TEXT", nullable: false),
                    StoreRoot = table.Column<string>(type: "TEXT", nullable: false),
                    UploadedByUsername = table.Column<string>(type: "TEXT", nullable: false),
                    UploadedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    OriginalFilename = table.Column<string>(type: "TEXT", nullable: true),
                    MimeType = table.Column<string>(type: "TEXT", maxLength: 32, nullable: true),
                    PageCount = table.Column<int>(type: "INTEGER", nullable: false),
                    FileHash = table.Column<byte[]>(type: "BLOB", nullable: false),
                    FileSize = table.Column<long>(type: "INTEGER", nullable: false),
                    ArchiveItemId = table.Column<int>(type: "INTEGER", nullable: true),
                    ArchiveItemTenantId = table.Column<int>(type: "INTEGER", nullable: true),
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
                    table.ForeignKey(
                        name: "FK_Blob_User_UploadedByUsername",
                        column: x => x.UploadedByUsername,
                        principalTable: "User",
                        principalColumn: "Username",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Tenant",
                columns: new[] { "Id", "Title" },
                values: new object[,]
                {
                    { -1, "Demo tenant" },
                    { 1, "Bergen tenant" },
                    { 2, "Göteborg tenant" },
                    { 3, "Odense tenant" }
                });

            migrationBuilder.InsertData(
                table: "User",
                columns: new[] { "Id", "Fullname", "HashedPassword", "Salt", "Username" },
                values: new object[,]
                {
                    { 1, "administrator", new byte[] { 66, 97, 132, 170, 246, 16, 68, 68, 72, 145, 44, 35, 199, 50, 35, 84, 112, 60, 127, 205, 114, 113, 188, 167, 150, 243, 56, 250, 120, 177, 230, 211 }, new byte[] { 1, 213, 129, 249, 180, 144, 52, 198, 48, 36, 202, 218, 185, 111, 72, 110 }, "admin@localhost" },
                    { 2, "administrator", new byte[] { 26, 203, 209, 61, 159, 191, 54, 248, 121, 147, 163, 133, 248, 108, 33, 6, 125, 123, 218, 97, 67, 209, 211, 124, 171, 0, 109, 3, 158, 2, 168, 130 }, new byte[] { 75, 244, 49, 87, 44, 141, 140, 88, 163, 169, 251, 113, 180, 222, 189, 35 }, "arjan@localhost" },
                    { 3, "administrator", new byte[] { 159, 5, 247, 59, 216, 19, 68, 8, 124, 63, 68, 167, 30, 143, 239, 125, 95, 99, 196, 80, 246, 239, 99, 31, 150, 41, 2, 1, 77, 164, 34, 236 }, new byte[] { 100, 0, 28, 185, 149, 198, 43, 203, 245, 177, 4, 21, 188, 183, 172, 125 }, "stian@localhost" }
                });

            migrationBuilder.InsertData(
                table: "UserTenant",
                columns: new[] { "TenantId", "UserId" },
                values: new object[,]
                {
                    { -1, 1 },
                    { 1, 1 },
                    { 1, 2 },
                    { 2, 1 },
                    { 2, 3 },
                    { 3, 2 }
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
                name: "IX_Blob_UploadedByUsername",
                table: "Blob",
                column: "UploadedByUsername");

            migrationBuilder.CreateIndex(
                name: "IX_Tag_Title_TenantId",
                table: "Tag",
                columns: new[] { "Title", "TenantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Token_Username",
                table: "Token",
                column: "Username");

            migrationBuilder.CreateIndex(
                name: "IX_User_Username",
                table: "User",
                column: "Username",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserTenant_TenantId_UserId",
                table: "UserTenant",
                columns: new[] { "TenantId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserTenant_UserId",
                table: "UserTenant",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ArchiveItemAndTag");

            migrationBuilder.DropTable(
                name: "Blob");

            migrationBuilder.DropTable(
                name: "Token");

            migrationBuilder.DropTable(
                name: "UserTenant");

            migrationBuilder.DropTable(
                name: "Tag");

            migrationBuilder.DropTable(
                name: "ArchiveItem");

            migrationBuilder.DropTable(
                name: "Tenant");

            migrationBuilder.DropTable(
                name: "User");
        }
    }
}
