using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.DbModel.Migrations
{
    /// <inheritdoc />
    public partial class AddLabelTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LabelId",
                table: "ArchiveItem",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Label",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    OwnerId = table.Column<int>(type: "INTEGER", nullable: false),
                    Title = table.Column<string>(type: "TEXT", nullable: false),
                    TenantId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Label", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Label_User_OwnerId",
                        column: x => x.OwnerId,
                        principalTable: "User",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ArchiveItem_LabelId",
                table: "ArchiveItem",
                column: "LabelId");

            migrationBuilder.CreateIndex(
                name: "IX_Label_OwnerId",
                table: "Label",
                column: "OwnerId");

            migrationBuilder.AddForeignKey(
                name: "FK_ArchiveItem_Label_LabelId",
                table: "ArchiveItem",
                column: "LabelId",
                principalTable: "Label",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ArchiveItem_Label_LabelId",
                table: "ArchiveItem");

            migrationBuilder.DropTable(
                name: "Label");

            migrationBuilder.DropIndex(
                name: "IX_ArchiveItem_LabelId",
                table: "ArchiveItem");

            migrationBuilder.DropColumn(
                name: "LabelId",
                table: "ArchiveItem");
        }
    }
}
