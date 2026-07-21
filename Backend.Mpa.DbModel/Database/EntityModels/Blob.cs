
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Mpa.DbModel.Database.EntityModels;


[Table(nameof(Blob))]
public class Blob : TenantEntity
{
	public Guid Id { get; set; }

	[MaxLength(32)]
	public string? MimeType { get; set; }
	public required int PageCount { get; set; }

	public ArchiveItem ArchiveItem { get; set; }

	public Guid ArchiveItemId { get; set; }
}
