
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Backend.DbModel.Database;

namespace Backend.DbModel.Database.EntityModels;


public record ArchiveItemId(int value) : StronglyTypedId<int>(value);


public class ArchiveItem : TenantEntity
{
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public ArchiveItemId? Id { get; set; }

    [StringLength(80)]
    public required string Title { get; set; }

    public required DateTimeOffset CreatedAt { get; set; }

    public required ICollection<Blob> Blobs { get; set; }

    public required ICollection<Tag> Tags { get; set; }
}
