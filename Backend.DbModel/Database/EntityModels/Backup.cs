
using System.ComponentModel.DataAnnotations.Schema;
using Backend.DbModel.Database.EntityModels;

[Table(nameof(BackupItem))]
public class BackupItem : TenantEntity
{
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }
    public ArchiveItem? ArchiveItem { get; set; }
}

[Table(nameof(Backup))]
public class Backup : TenantEntity
{
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }
    public DateTimeOffset? LastStartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
}