using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Mpa.DbModel.Database.EntityModels;


[Table(nameof(ArchiveItemAndTag))]
[Index(nameof(ArchiveItemId), nameof(TagId), IsUnique = true)]
public class ArchiveItemAndTag : TenantEntity
{
    public int Id { get; set; }
	public Guid ArchiveItemId { get; set; }
    public int TagId { get; set; }
}
