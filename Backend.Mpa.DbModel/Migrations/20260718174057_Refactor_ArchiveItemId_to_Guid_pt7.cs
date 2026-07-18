using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Mpa.DbModel.Migrations
{
    /// <inheritdoc />
    public partial class Refactor_ArchiveItemId_to_Guid_pt7 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ArchiveItemAndTag_ArchiveItem_ArchiveItemGuid_TenantId",
                table: "ArchiveItemAndTag");

            migrationBuilder.DropForeignKey(
                name: "FK_Blob_ArchiveItem_ArchiveItemGuid_ArchiveItemTenantId",
                table: "Blob");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_ArchiveItem_Guid_TenantId",
                table: "ArchiveItem");

            migrationBuilder.RenameColumn(
                name: "ArchiveItemGuid",
                table: "Blob",
                newName: "ArchiveItemId");

            migrationBuilder.RenameIndex(
                name: "IX_Blob_ArchiveItemGuid_ArchiveItemTenantId",
                table: "Blob",
                newName: "IX_Blob_ArchiveItemId_ArchiveItemTenantId");

            migrationBuilder.RenameColumn(
                name: "ArchiveItemGuid",
                table: "ArchiveItemAndTag",
                newName: "ArchiveItemId");

            migrationBuilder.RenameIndex(
                name: "IX_ArchiveItemAndTag_ArchiveItemGuid_TenantId",
                table: "ArchiveItemAndTag",
                newName: "IX_ArchiveItemAndTag_ArchiveItemId_TenantId");

            migrationBuilder.RenameIndex(
                name: "IX_ArchiveItemAndTag_ArchiveItemGuid_TagId",
                table: "ArchiveItemAndTag",
                newName: "IX_ArchiveItemAndTag_ArchiveItemId_TagId");

            migrationBuilder.RenameColumn(
                name: "Guid",
                table: "ArchiveItem",
                newName: "Id");

            migrationBuilder.AddUniqueConstraint(
                name: "AK_ArchiveItem_Id_TenantId",
                table: "ArchiveItem",
                columns: new[] { "Id", "TenantId" });

            migrationBuilder.AddForeignKey(
                name: "FK_ArchiveItemAndTag_ArchiveItem_ArchiveItemId_TenantId",
                table: "ArchiveItemAndTag",
                columns: new[] { "ArchiveItemId", "TenantId" },
                principalTable: "ArchiveItem",
                principalColumns: new[] { "Id", "TenantId" },
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Blob_ArchiveItem_ArchiveItemId_ArchiveItemTenantId",
                table: "Blob",
                columns: new[] { "ArchiveItemId", "ArchiveItemTenantId" },
                principalTable: "ArchiveItem",
                principalColumns: new[] { "Id", "TenantId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ArchiveItemAndTag_ArchiveItem_ArchiveItemId_TenantId",
                table: "ArchiveItemAndTag");

            migrationBuilder.DropForeignKey(
                name: "FK_Blob_ArchiveItem_ArchiveItemId_ArchiveItemTenantId",
                table: "Blob");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_ArchiveItem_Id_TenantId",
                table: "ArchiveItem");

            migrationBuilder.RenameColumn(
                name: "ArchiveItemId",
                table: "Blob",
                newName: "ArchiveItemGuid");

            migrationBuilder.RenameIndex(
                name: "IX_Blob_ArchiveItemId_ArchiveItemTenantId",
                table: "Blob",
                newName: "IX_Blob_ArchiveItemGuid_ArchiveItemTenantId");

            migrationBuilder.RenameColumn(
                name: "ArchiveItemId",
                table: "ArchiveItemAndTag",
                newName: "ArchiveItemGuid");

            migrationBuilder.RenameIndex(
                name: "IX_ArchiveItemAndTag_ArchiveItemId_TenantId",
                table: "ArchiveItemAndTag",
                newName: "IX_ArchiveItemAndTag_ArchiveItemGuid_TenantId");

            migrationBuilder.RenameIndex(
                name: "IX_ArchiveItemAndTag_ArchiveItemId_TagId",
                table: "ArchiveItemAndTag",
                newName: "IX_ArchiveItemAndTag_ArchiveItemGuid_TagId");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "ArchiveItem",
                newName: "Guid");

            migrationBuilder.AddUniqueConstraint(
                name: "AK_ArchiveItem_Guid_TenantId",
                table: "ArchiveItem",
                columns: new[] { "Guid", "TenantId" });

            migrationBuilder.AddForeignKey(
                name: "FK_ArchiveItemAndTag_ArchiveItem_ArchiveItemGuid_TenantId",
                table: "ArchiveItemAndTag",
                columns: new[] { "ArchiveItemGuid", "TenantId" },
                principalTable: "ArchiveItem",
                principalColumns: new[] { "Guid", "TenantId" },
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Blob_ArchiveItem_ArchiveItemGuid_ArchiveItemTenantId",
                table: "Blob",
                columns: new[] { "ArchiveItemGuid", "ArchiveItemTenantId" },
                principalTable: "ArchiveItem",
                principalColumns: new[] { "Guid", "TenantId" });
        }
    }
}
