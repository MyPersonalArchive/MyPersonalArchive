using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.DbModel.Database.EntityModels;


[Table(nameof(UserTenant))]
[Index(nameof(TenantId), nameof(UserId), IsUnique = true)]
[PrimaryKey(nameof(TenantId), nameof(UserId))]
public class UserTenant : SharedEntity
{
    public required int TenantId { get; set; }
    public required int UserId { get; set; }
}