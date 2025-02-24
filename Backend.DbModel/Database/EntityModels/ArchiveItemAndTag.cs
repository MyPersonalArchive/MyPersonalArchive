using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using Backend.DbModel.Database;

namespace Backend.DbModel.Database.EntityModels;


[Table(nameof(ArchiveItemAndTag))]
[Index(nameof(ArchiveItemId), nameof(TagId), IsUnique = true)]
public class ArchiveItemAndTag : TenantEntity
{
    public int Id { get; set; }
    public int ArchiveItemId { get; set; }
    public int TagId { get; set; }
}
