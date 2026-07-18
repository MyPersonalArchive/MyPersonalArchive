using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Mpa.DbModel.Migrations
{
    /// <inheritdoc />
    public partial class RemoveLegacyArchiveItemIdFromArchiveItemAndTag : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Blob_ArchiveItem_ArchiveItemId_ArchiveItemTenantId",
                table: "Blob");

            if (ActiveProvider == "Microsoft.EntityFrameworkCore.Sqlite")
            {
                migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_Blob_ArchiveItemId_ArchiveItemTenantId\";");
            }
            else
            {
                migrationBuilder.DropIndex(
                    name: "IX_Blob_ArchiveItemId_ArchiveItemTenantId",
                    table: "Blob");
            }

            migrationBuilder.DropColumn(
                name: "ArchiveItemId",
                table: "Blob");

            if (ActiveProvider == "Microsoft.EntityFrameworkCore.Sqlite")
            {
                migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_Blob_ArchiveItemGuid_ArchiveItemTenantId\" ON \"Blob\" (\"ArchiveItemGuid\", \"ArchiveItemTenantId\");");
            }
            else
            {
                migrationBuilder.CreateIndex(
                    name: "IX_Blob_ArchiveItemGuid_ArchiveItemTenantId",
                    table: "Blob",
                    columns: new[] { "ArchiveItemGuid", "ArchiveItemTenantId" });
            }

            migrationBuilder.AddForeignKey(
                name: "FK_Blob_ArchiveItem_ArchiveItemGuid_ArchiveItemTenantId",
                table: "Blob",
                columns: new[] { "ArchiveItemGuid", "ArchiveItemTenantId" },
                principalTable: "ArchiveItem",
                principalColumns: new[] { "Guid", "TenantId" });

            migrationBuilder.DropForeignKey(
                name: "FK_ArchiveItemAndTag_ArchiveItem_ArchiveItemId_TenantId",
                table: "ArchiveItemAndTag");

            if (ActiveProvider == "Microsoft.EntityFrameworkCore.Sqlite")
            {
                migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_ArchiveItemAndTag_ArchiveItemId_TenantId\";");
            }
            else
            {
                migrationBuilder.DropIndex(
                    name: "IX_ArchiveItemAndTag_ArchiveItemId_TenantId",
                    table: "ArchiveItemAndTag");
            }

            if (ActiveProvider == "Microsoft.EntityFrameworkCore.Sqlite")
            {
                migrationBuilder.Sql("CREATE UNIQUE INDEX IF NOT EXISTS \"IX_ArchiveItemAndTag_ArchiveItemGuid_TagId\" ON \"ArchiveItemAndTag\" (\"ArchiveItemGuid\", \"TagId\");");
            }
            else
            {
                migrationBuilder.CreateIndex(
                    name: "IX_ArchiveItemAndTag_ArchiveItemGuid_TagId",
                    table: "ArchiveItemAndTag",
                    columns: new[] { "ArchiveItemGuid", "TagId" },
                    unique: true);
            }

            if (ActiveProvider == "Microsoft.EntityFrameworkCore.Sqlite")
            {
                migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_ArchiveItemAndTag_ArchiveItemGuid_TenantId\" ON \"ArchiveItemAndTag\" (\"ArchiveItemGuid\", \"TenantId\");");
            }
            else
            {
                migrationBuilder.CreateIndex(
                    name: "IX_ArchiveItemAndTag_ArchiveItemGuid_TenantId",
                    table: "ArchiveItemAndTag",
                    columns: new[] { "ArchiveItemGuid", "TenantId" });
            }

            migrationBuilder.AddForeignKey(
                name: "FK_ArchiveItemAndTag_ArchiveItem_ArchiveItemGuid_TenantId",
                table: "ArchiveItemAndTag",
                columns: new[] { "ArchiveItemGuid", "TenantId" },
                principalTable: "ArchiveItem",
                principalColumns: new[] { "Guid", "TenantId" },
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.DropIndex(
                name: "IX_ArchiveItemAndTag_ArchiveItemId_TagId",
                table: "ArchiveItemAndTag");

            migrationBuilder.DropColumn(
                name: "ArchiveItemId",
                table: "ArchiveItemAndTag");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_ArchiveItem_Id_TenantId",
                table: "ArchiveItem");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Blob_ArchiveItem_ArchiveItemGuid_ArchiveItemTenantId",
                table: "Blob");

            if (ActiveProvider == "Microsoft.EntityFrameworkCore.Sqlite")
            {
                migrationBuilder.Sql("DROP INDEX IF EXISTS \"IX_Blob_ArchiveItemGuid_ArchiveItemTenantId\";");
            }
            else
            {
                migrationBuilder.DropIndex(
                    name: "IX_Blob_ArchiveItemGuid_ArchiveItemTenantId",
                    table: "Blob");
            }

            migrationBuilder.AddColumn<int>(
                name: "ArchiveItemId",
                table: "Blob",
                type: "INTEGER",
                nullable: true);

            if (ActiveProvider == "Microsoft.EntityFrameworkCore.Sqlite")
            {
                migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_Blob_ArchiveItemId_ArchiveItemTenantId\" ON \"Blob\" (\"ArchiveItemId\", \"ArchiveItemTenantId\");");
            }
            else
            {
                migrationBuilder.CreateIndex(
                    name: "IX_Blob_ArchiveItemId_ArchiveItemTenantId",
                    table: "Blob",
                    columns: new[] { "ArchiveItemId", "ArchiveItemTenantId" });
            }

            migrationBuilder.AddForeignKey(
                name: "FK_Blob_ArchiveItem_ArchiveItemId_ArchiveItemTenantId",
                table: "Blob",
                columns: new[] { "ArchiveItemId", "ArchiveItemTenantId" },
                principalTable: "ArchiveItem",
                principalColumns: new[] { "Id", "TenantId" });

            migrationBuilder.AddColumn<int>(
                name: "ArchiveItemId",
                table: "ArchiveItemAndTag",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddUniqueConstraint(
                name: "AK_ArchiveItem_Id_TenantId",
                table: "ArchiveItem",
                columns: new[] { "Id", "TenantId" });

            migrationBuilder.CreateIndex(
                name: "IX_ArchiveItemAndTag_ArchiveItemId_TagId",
                table: "ArchiveItemAndTag",
                columns: new[] { "ArchiveItemId", "TagId" },
                unique: true);

            if (ActiveProvider == "Microsoft.EntityFrameworkCore.Sqlite")
            {
                migrationBuilder.Sql("CREATE INDEX IF NOT EXISTS \"IX_ArchiveItemAndTag_ArchiveItemId_TenantId\" ON \"ArchiveItemAndTag\" (\"ArchiveItemId\", \"TenantId\");");
            }
            else
            {
                migrationBuilder.CreateIndex(
                    name: "IX_ArchiveItemAndTag_ArchiveItemId_TenantId",
                    table: "ArchiveItemAndTag",
                    columns: new[] { "ArchiveItemId", "TenantId" });
            }

            migrationBuilder.DropForeignKey(
                name: "FK_ArchiveItemAndTag_ArchiveItem_ArchiveItemGuid_TenantId",
                table: "ArchiveItemAndTag");

            migrationBuilder.DropIndex(
                name: "IX_ArchiveItemAndTag_ArchiveItemGuid_TagId",
                table: "ArchiveItemAndTag");

            migrationBuilder.DropIndex(
                name: "IX_ArchiveItemAndTag_ArchiveItemGuid_TenantId",
                table: "ArchiveItemAndTag");

            migrationBuilder.AddForeignKey(
                name: "FK_ArchiveItemAndTag_ArchiveItem_ArchiveItemId_TenantId",
                table: "ArchiveItemAndTag",
                columns: new[] { "ArchiveItemId", "TenantId" },
                principalTable: "ArchiveItem",
                principalColumns: new[] { "Id", "TenantId" },
                onDelete: ReferentialAction.Cascade);
        }
    }
}
