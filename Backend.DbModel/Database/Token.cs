
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.DbModel.Database;

[Table(nameof(Token))]
public class Token : SharedEntity
{
    public int Id { get; set; }

    [StringLength(80)]
    [Required]
    public required string Username { get; set; }

    [MaxLength(44)] // Length for a Base64 encoding of a 256 bit binary (256/8 = 32 bytes, each 3 bytes encodes into 4 characters of base 64 => 44 characters)
    [Required]
    public required string RefreshToken { get; set; }

    public DateTimeOffset ExpiresAt { get; set; }

    public User? User { get; set; }
}
