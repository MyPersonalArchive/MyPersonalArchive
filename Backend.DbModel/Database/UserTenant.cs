using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.DbModel.Database;

[Table(nameof(UserTenant))]
[Index(nameof(TenantId), nameof(UserId), IsUnique = true)]
[PrimaryKey(nameof(TenantId), nameof(UserId))]
public class UserTenant : SharedEntity
{
    public int TenantId { get; set; }
    public int UserId { get; set; }
}