using Backend.DbModel.Database;
using Backend.DbModel.Database.EntityModels;

namespace Backend.WebApi;

public class DemoDataGenerator
{
    private static readonly IList<string> _firstPart = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth"];
    private static readonly IList<string> _secondPart = ["demo", "test", "example", "sample", "trial", "pilot"];
    private static readonly IList<string> _thirdPart = ["item", "entry", "record", "piece", "object"];
    private static readonly IList<string> _genres = ["Disco", "Pop", "Metal", "Rock", "Techno", "Rave", "House", "EDM", "Hiphop", "Jazz", "Blues", "Classical", "Opera", "Reggae", "Ska", "Country", "Folk", "HipHop", "Rap", "Electronic", "Dance", "Ambient", "Chillout"];

    public static void Seed(MpaDbContext dbContext)
    {
        if (dbContext.ArchiveItems.Any())
        {
            return;
        }

        var rnd = new Random(1);
        var username = "admin@localhost";

        foreach (var first in _firstPart)
        {
            foreach (var second in _secondPart)
            {
                foreach (var third in _thirdPart)
                {
                    var title = $"{first} {second} {third}";
                    var tags = _genres.OrderBy(x => rnd.Next()).Take(rnd.Next(0, 7)).ToList();
                    var item = new ArchiveItem
                    {
                        Title = title,
                        Tags = Tags.Ensure(dbContext, tags),
                        Blobs = [],
                        CreatedByUsername = username,
                        CreatedAt = DateTimeOffset.Now.Date.AddDays(-rnd.Next(0, 365)).AddMinutes(-rnd.Next(0, 1440))
                    };
                    dbContext.ArchiveItems.Add(item);
                    dbContext.SaveChanges();
                }
            }
        }

    }
}