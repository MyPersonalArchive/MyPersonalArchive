
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.DbModel.Database.EntityModels;


public record UserId(int value) : StronglyTypedId<int>(value);

[Table(nameof(User))]
[Index(nameof(Username), IsUnique = true)]
public class User : SharedEntity
{
    public required UserId Id { get; set; }

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
