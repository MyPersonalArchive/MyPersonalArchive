using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Backend.DbModel.Migrations
{
    /// <inheritdoc />
    public partial class InitialMigration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ArchiveItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Title = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    Created = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    TenantId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ArchiveItems", x => x.Id);
                });

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
                name: "Blob",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    PathInStore = table.Column<string>(type: "TEXT", nullable: false),
                    StoreRoot = table.Column<string>(type: "TEXT", nullable: false),
                    ArchiveItemId = table.Column<int>(type: "INTEGER", nullable: true),
                    TenantId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Blob", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Blob_ArchiveItems_ArchiveItemId",
                        column: x => x.ArchiveItemId,
                        principalTable: "ArchiveItems",
                        principalColumn: "Id");
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
                        name: "FK_ArchiveItemAndTag_ArchiveItems_ArchiveItemId",
                        column: x => x.ArchiveItemId,
                        principalTable: "ArchiveItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ArchiveItemAndTag_Tag_TagId",
                        column: x => x.TagId,
                        principalTable: "Tag",
                        principalColumn: "Id",
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
                    Expires = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
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

            migrationBuilder.InsertData(
                table: "ArchiveItems",
                columns: new[] { "Id", "Created", "TenantId", "Title" },
                values: new object[,]
                {
                    { 1, new DateTimeOffset(new DateTime(2025, 2, 5, 12, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, -2, 0, 0, 0)), 0, "First demo item" },
                    { 2, new DateTimeOffset(new DateTime(2025, 2, 5, 12, 15, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, -2, 0, 0, 0)), 0, "Second demo item" }
                });

            migrationBuilder.InsertData(
                table: "Tenant",
                columns: new[] { "Id", "Title" },
                values: new object[] { -1, "Demo tenant" });

            migrationBuilder.InsertData(
                table: "User",
                columns: new[] { "Id", "Fullname", "HashedPassword", "Salt", "Username" },
                values: new object[] { 1, "administrator", new byte[] { 66, 97, 132, 170, 246, 16, 68, 68, 72, 145, 44, 35, 199, 50, 35, 84, 112, 60, 127, 205, 114, 113, 188, 167, 150, 243, 56, 250, 120, 177, 230, 211 }, new byte[] { 1, 213, 129, 249, 180, 144, 52, 198, 48, 36, 202, 218, 185, 111, 72, 110 }, "admin@localhost" });

            migrationBuilder.InsertData(
                table: "UserTenant",
                columns: new[] { "TenantId", "UserId" },
                values: new object[] { -1, 1 });

            migrationBuilder.CreateIndex(
                name: "IX_ArchiveItemAndTag_ArchiveItemId_TagId",
                table: "ArchiveItemAndTag",
                columns: new[] { "ArchiveItemId", "TagId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ArchiveItemAndTag_TagId",
                table: "ArchiveItemAndTag",
                column: "TagId");

            migrationBuilder.CreateIndex(
                name: "IX_Blob_ArchiveItemId",
                table: "Blob",
                column: "ArchiveItemId");

            migrationBuilder.CreateIndex(
                name: "IX_Tag_Title",
                table: "Tag",
                column: "Title",
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
                name: "ArchiveItems");

            migrationBuilder.DropTable(
                name: "Tenant");

            migrationBuilder.DropTable(
                name: "User");
        }
    }
}
