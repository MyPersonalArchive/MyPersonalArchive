using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Mpa.DbModel.Database.EntityModels;


[Table(nameof(ArchiveItemAndTag))]
[Index(nameof(ArchiveItemGuid), nameof(TagId), IsUnique = true)]
public class ArchiveItemAndTag : TenantEntity
{
    public int Id { get; set; }
	public Guid ArchiveItemGuid { get; set; }
    public int TagId { get; set; }
}
