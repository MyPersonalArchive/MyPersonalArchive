
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.DbModel.Database;

[Table(nameof(Tag))]
[Index(nameof(Title), IsUnique = true)]
public class Tag : TenantEntity
{
    public int Id { get; set; }

    [StringLength(80)]
    [Required]
    public required string Title { get; set; }

    public ICollection<ArchiveItem>? ArchiveItems { get; set; }
}
