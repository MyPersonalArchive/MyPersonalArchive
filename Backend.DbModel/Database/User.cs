
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.DbModel.Database;

[Table(nameof(User))]
public class User : SharedEntity
{
    public int Id { get; set; }

    [StringLength(80)]
    public required string Username { get; set; }

    [MaxLength(400)]
    public required string Fullname { get; set; }

    [MaxLength(32)]
    public required byte[] HashedPassword { get; set; }

    [MaxLength(16)]
    public required byte[] Salt { get; set; }

    public ICollection<Token>? Tokens { get; set; }

    public ICollection<Tenant>? Tenants { get; set; }
}
