
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Mpa.DbModel.Database.EntityModels;


[Table(nameof(Blob))]
public class Blob : TenantEntity
{
	public Guid Id { get; set; }

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

	public Guid? ArchiveItemGuid { get; set; }
}
