
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.DbModel.Database;

public class ArchiveItem : TenantEntity
{
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [StringLength(80)]
    public required string Title { get; set; }

    public required DateTimeOffset Created { get; set; }

    public ICollection<Blob>? Blobs { get; set; }

    public ICollection<Tag> Tags { get; set; } = [];
}
