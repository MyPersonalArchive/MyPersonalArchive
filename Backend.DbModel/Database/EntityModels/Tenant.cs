
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.DbModel.Database.EntityModels;


public record TenantId(int value) : StronglyTypedId<int>(value);

[Table(nameof(Tenant))]
[PrimaryKey(nameof(Id))]
public class Tenant : SharedEntity
{
    public required TenantId Id { get; set; }

    [Required]
    [StringLength(80)]
    public required string Title { get; set; }

    public ICollection<User>? Users { get; set; }
}
