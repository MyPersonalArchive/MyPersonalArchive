
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Backend.DbModel.Database;

[Table(nameof(Tag))]
[Index(nameof(Title), nameof(TenantId), IsUnique = true)]
public class Tag : TenantEntity
{
    public int Id { get; set; }

    [StringLength(80)]
    [Required]
    public required string Title { get; set; }

    public ICollection<ArchiveItem>? ArchiveItems { get; set; }
}


public static class Tags
{
    public static ICollection<Tag> EnsureTags(this MpaDbContext dbContext, params IEnumerable<string> tagTitles)
        => Ensure(dbContext, tagTitles);

    public static ICollection<Tag> Ensure(MpaDbContext dbContext, params IEnumerable<string> tagTitles)
    {
        Tag EnsureTag(string tagTitle) => dbContext.Tags.FirstOrDefault(x => x.Title == tagTitle) ?? dbContext.Tags.Add(new Tag { Title = tagTitle }).Entity;
        var tags = tagTitles.Distinct().Select(EnsureTag);
        dbContext.SaveChanges();
        
        return [.. tags];
    }
}
