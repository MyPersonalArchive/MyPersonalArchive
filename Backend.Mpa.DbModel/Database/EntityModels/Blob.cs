
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Mpa.DbModel.Database.EntityModels;


public enum StoreRoot
{
    FileStorage,
    CloudStorage
}


[Table(nameof(Blob))]
public class Blob : TenantEntity
{
    public int Id { get; set; }

	public Guid Guid { get; set; }

    [Required]
    public required string PathInStore { get; set; }    // Relative to the blob store root

    public required string UploadedByUsername { get; set; }
    public User? UploadedBy { get; set; }
    public required DateTimeOffset UploadedAt { get; set; }

    public string? OriginalFilename { get; set; }
    [MaxLength(32)]
    public string? MimeType { get; set; }
    public required int PageCount { get; set; }

    public long FileSize { get; set; }

    public ArchiveItem? ArchiveItem { get; set; }
}
