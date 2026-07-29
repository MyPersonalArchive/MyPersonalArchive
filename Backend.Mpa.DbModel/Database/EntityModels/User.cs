
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.Mpa.DbModel.Database.EntityModels;


[Table(nameof(User))]
[Index(nameof(Username), IsUnique = true)]
[Index(nameof(Issuer), nameof(Subject), IsUnique = true)]
public class User : SharedEntity
{
    public int Id { get; set; }

    [StringLength(80)]
    public required string Username { get; set; }

    [MaxLength(400)]
    public required string Fullname { get; set; }

    [MaxLength(32)]
    public byte[]? HashedPassword { get; set; }

    [MaxLength(16)]
    public byte[]? Salt { get; set; }

    [MaxLength(400)]
    public string? Issuer { get; set; }

    [MaxLength(200)]
    public string? Subject { get; set; }

    public ICollection<Tenant> Tenants { get; set; } = [];
}
