using System.Text.Json.Nodes;
using Backend.DbModel.Database;
using Backend.DbModel.Database.EntityModels;

namespace Backend.WebApi;

public class DemoDataGenerator
{
    private class GeneratorData
    {
        public int TenantId;
        public required IList<string> Usernames;
        public required IList<string> FirstPart;
        public required IList<string> SecondPart;
        public required IList<string> ThirdPart;
        public required IList<string> Tags;
    }

    private static readonly GeneratorData[] _generatorData =
    [
        new GeneratorData
        {
            TenantId = -1,
            Usernames = ["admin@localhost"],
            FirstPart = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth"],
            SecondPart = ["demo", "test", "example", "sample", "trial", "pilot"],
            ThirdPart = ["item", "entry", "record", "piece", "object"],
            Tags = ["Disco", "Pop", "Metal", "Rock", "Techno", "Rave", "House", "EDM", "Hiphop", "Jazz", "Blues", "Classical", "Opera", "Reggae", "Ska", "Country", "Folk", "HipHop", "Rap", "Electronic", "Dance", "Ambient", "Chillout"]
        },
        new GeneratorData
        {
            TenantId = 1,
            Usernames = ["admin@localhost", "arjan@localhost"],
            FirstPart = ["Uno", "Dos", "Tres", "Cuatro", "Cinco", "Seis", "Siete", "Ocho", "Nueve", "Diez"],
            SecondPart = ["demo", "test", "example", "sample", "trial", "pilot"],
            ThirdPart = ["item", "entry", "record", "piece", "object"],
            Tags = ["Jamon", "Pollo", "Pescado", "Carne", "Verduras", "Frutas", "Queso"]
        },
        new GeneratorData
        {
            Usernames = ["admin@localhost", "stian@localhost"],
            TenantId = 2,
            FirstPart = ["Eins", "Zwei", "Drei", "Vier", "Fünf", "Sechs", "Sieben", "Acht", "Neun", "Zehn"],
            SecondPart = ["demo", "test", "example", "sample", "trial", "pilot"],
            ThirdPart = ["item", "entry", "record", "piece", "object"],
            Tags = ["München", "Dresden", "Berlin", "Hamburg", "Köln", "Frankfurt", "Stuttgart", "Düsseldorf", "Dortmund"]
        },
        new GeneratorData
        {
            Usernames = ["arjan@localhost"],
            TenantId = 3,
            FirstPart = ["Un", "Deux", "Trois", "Quatre", "Cinq", "Six", "Sept", "Huit", "Neuf", "Dix"],
            SecondPart = ["demo", "test", "example", "sample", "trial", "pilot"],
            ThirdPart = ["item", "entry", "record", "piece", "object"],
            Tags = ["Blanc", "Noir", "Rouge", "Vert", "Bleu", "Jaune", "Violet", "Orange", "Rose", "Marron", "Gris"]
        }
    ];

    public static void Seed(DbConfig dbConfig)
    {
        foreach (var data in _generatorData)
        {
            Seed(dbConfig, data);
        }
    }


    private static void Seed(DbConfig dbConfig, GeneratorData data)
    {
        using var dbContext = new MpaDbContext(dbConfig, data.TenantId);
        if (dbContext.ArchiveItems.Any())
        {
            return;
        }

        var rng = new Random(data.TenantId);

        foreach (var first in data.FirstPart)
            foreach (var second in data.SecondPart)
                foreach (var third in data.ThirdPart)
                {
                    var title = $"{first} {second} {third}";
                    var tags = data.Tags.OrderBy(x => rng.Next()).Take(rng.Next(0, 7)).ToList();
                    var item = new ArchiveItem
                    {
                        Title = title,
                        Tags = Tags.Ensure(dbContext, tags),
                        Blobs = [],
                        CreatedByUsername = data.Usernames.OrderBy(x => rng.Next()).First(),
                        CreatedAt = DateTimeOffset.Now.Date.AddDays(-rng.Next(0, 365)).AddMinutes(-rng.Next(0, 1440)),
                        Metadata = []
                    };

                    dbContext.ArchiveItems.Add(item);
                    dbContext.SaveChanges();
                }
    }
}