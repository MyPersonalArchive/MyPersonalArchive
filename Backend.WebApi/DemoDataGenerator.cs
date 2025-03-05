using Backend.DbModel.Database;
using Backend.DbModel.Database.EntityModels;

namespace Backend.WebApi;

public class DemoDataGenerator
{
    public static void Seed(MpaDbContext dbContext)
    {
        var timezoneOffset = TimeSpan.FromHours(-2);
        var username = "admin@localhost";
        // var user = dbContext.Users.First(u => u.Username == username);
        var archiveItemsToEnsure = new List<ArchiveItem>{
                    new ArchiveItem {
                        Id = 1,
                        Title = "First demo item",
                        Tags = Tags.Ensure(dbContext, "Disco", "Pop", "Metal", "Rock"),
                        Blobs = [],
                        CreatedByUsername = username,
                        // CreatedBy = user,
                        CreatedAt = new DateTimeOffset(2025, 2, 5, 12, 0, 0, timezoneOffset)
                    },
                    new ArchiveItem {
                        Id = 2,
                        Title = "Second demo item",
                        Tags = Tags.Ensure(dbContext, "Techno", "Rave"),
                        Blobs = [],
                        CreatedByUsername = username,
                        // CreatedBy = user,
                        CreatedAt = new DateTimeOffset(2025, 2, 5, 12, 15, 0, timezoneOffset)
                    },
                    new ArchiveItem {
                        Id = 3,
                        Title = "Third demo item",
                        Tags = Tags.Ensure(dbContext, "House", "EDM", "Hiphop"),
                        Blobs = [],
                        CreatedByUsername = username,
                        // CreatedBy = user,
                        CreatedAt = new DateTimeOffset(2025, 2, 9, 15, 20, 0, timezoneOffset)
                    }
            };
        foreach (var item in archiveItemsToEnsure)
        {
            if (dbContext.ArchiveItems.All(ai => ai.Id != item.Id))
            {
                dbContext.ArchiveItems.Add(item);
            }
        }

        dbContext.SaveChanges();
    }
}