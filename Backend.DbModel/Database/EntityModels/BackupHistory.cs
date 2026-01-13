
using System.ComponentModel.DataAnnotations.Schema;
using Backend.DbModel.Database.EntityModels;

[Table(nameof(BackupHistory))]
public class BackupHistory : TenantEntity
{
	[DatabaseGenerated(DatabaseGeneratedOption.Identity)]
	public int Id { get; set; }
	public required DateTimeOffset StartedAt { get; set; }
	public DateTimeOffset? CompletedAt { get; set; }
	public required int BackupDestinationId { get; set; }
	public BackupDestination? BackupDestination { get; set; }

	public required BackupStatus Status { get; set; }

	public required string LogPath { get; set; }
	// Log entries for each step
	// - connection steps and queries
	// - items processed
	// - errors, warnings, etc.

	public enum BackupStatus
	{
		Started = 1,    // establishing connection, determining items to backup, etc.
		Running = 2,    // actively backing up items
		Completed = 3,  // all items backed up successfully
		Failed = 4      // encountered errors preventing completion
	}
}