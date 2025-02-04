
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.DbModel.Database;

[Table(nameof(Tenant))]
public class Tenant : SharedEntity
{
    public int Id { get; set; }

    [Required]
    [StringLength(80)]
    public required string Title { get; set; }

    public ICollection<User>? Users { get; set; }
}
