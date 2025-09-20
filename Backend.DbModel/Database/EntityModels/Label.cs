
using System.ComponentModel.DataAnnotations.Schema;
using Backend.DbModel.Database.EntityModels;

[Table(nameof(Label))]
public class Label : TenantEntity //UserEntity? Should be per user not per tenant
{
    public int Id { get; set; }
    public required User Owner { get; set; }
    public required string Title { get; set; }
}