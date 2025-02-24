
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.DbModel.Database.EntityModels;


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

    public string? UploadedByUsername { get; set; }
    public User? UploadedBy { get; set; }
    public required DateTimeOffset UploadedAt { get; set; }

    public required Metadata Metadata { get; set; }

    public ArchiveItem? ArchiveItem { get; set; }
}


[Owned]
public class Metadata
{
    public string? OriginalFilename { get; set; }
    public string? MimeType { get; set; }
    public long FileSize { get; set; }

    [MaxLength(32)]
    public required byte[] Hash { get; set; }
}

