
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Nodes;
using Backend.DbModel.Database.EntityModels;

[Table(nameof(BackupDestination))]
public class BackupDestination : TenantEntity
{
	[DatabaseGenerated(DatabaseGeneratedOption.Identity)]
	public int Id { get; set; }
	public required string Title { get; set; }
	public required JsonObject Metadata { get; set; }
	// e.g. connection details, protocol, paths, credentials, encryption (key used, algorithm), etc.
}
