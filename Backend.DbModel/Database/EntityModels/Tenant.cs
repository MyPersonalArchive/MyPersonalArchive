
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.DbModel.Database.EntityModels;


[Table(nameof(Tenant))]
[PrimaryKey(nameof(Id))]
public class Tenant : SharedEntity
{
    public int Id { get; set; }

    [Required]
    [StringLength(80)]
    public required string Title { get; set; }

    public ICollection<User>? Users { get; set; }
}
