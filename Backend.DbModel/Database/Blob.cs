
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.DbModel.Database;

public enum StoreRoot
{
    FileStorage,
    CloudStorage
}

[Table(nameof(Blob))]
public class Blob : TenantEntity
{
    public int Id { get; set; }

    [Required]
    public required string PathInStore { get; set; }    // Relative to the blob store root
    public required string StoreRoot { get; set; }   // Multiple blob stores could exist (local, cloud, etc.)
}
