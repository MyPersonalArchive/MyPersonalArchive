
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.DbModel.Database.EntityModels;


[Table(nameof(ArchiveItem))]
public class ArchiveItem : TenantEntity
{
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [StringLength(80)]
    public required string Title { get; set; }

    public required string CreatedByUsername { get; set; }
    public User? CreatedBy { get; set; }
    public required DateTimeOffset CreatedAt { get; set; }

    public required ICollection<Blob> Blobs { get; set; }

    public required ICollection<Tag> Tags { get; set; }
}
