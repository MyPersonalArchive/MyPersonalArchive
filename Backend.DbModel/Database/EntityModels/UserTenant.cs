using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.DbModel.Database.EntityModels;


[Table(nameof(UserTenant))]
[Index(nameof(TenantId), nameof(UserId), IsUnique = true)]
[PrimaryKey(nameof(TenantId), nameof(UserId))]
public class UserTenant : SharedEntity
{
    public required TenantId TenantId { get; set; }
    public required UserId UserId { get; set; }
}