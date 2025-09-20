
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Nodes;

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

    public ICollection<Blob>? Blobs { get; set; }

    public Label? Label { get; set; }

    public required ICollection<Tag> Tags { get; set; }

    public required JsonObject Metadata { get; set; }
}
