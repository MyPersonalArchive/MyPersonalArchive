// See https://aka.ms/new-console-template for more information
using Backend.DbModel.Database;
using System;
using Backend.Core;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ConsoleApp1;


internal class Program
{
    private static void Main(string[] args)
    {
        Console.WriteLine("Hello!");

        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");

        var config = new ConfigurationBuilder()
            .SetBasePath(AppDomain.CurrentDomain.BaseDirectory) // Set the base path
            .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true) // Load from JSON
            .AddJsonFile($"appsettings.{environment}.json", optional: true, reloadOnChange: true) // Load from JSON
            .AddEnvironmentVariables() // Load from Environment Variables
            .AddCommandLine(args) // Load from Command-Line Arguments
            .Build();


        var serviceProvider = new ServiceCollection()
            .Configure<DbConfig>(config.GetSection("AppConfig"))
            .Configure<JwtConfig>(options => JwtConfig.Mapper(options, config))
            .AddTransient<AmbientDataResolver, DummyAmbientDataResolver>()
            .AddTransient<PasswordHasher>()
            .AddDbContext<MpaDbContext>()
            .BuildServiceProvider();

        serviceProvider.GetRequiredService<MpaDbContext>();

        serviceProvider.GetRequiredService<PasswordHasher>();


        Console.WriteLine("Goodbye!");

        #region db stuff
        // using var db = new MpaDbContext();
        // // CreateArchiveItem(db);
        // // CreateUser(db);
        // // db.SaveChanges();

        // // var entry = db.Entry(receipt);
        // // entry.Collection(x => x.Tags).Load();
        // // entry.Reference(x => x.Currency).Load();

        // IEnumerable<Tag> EnsureTags(params string[] tagTitles)
        // {
        //     var tags = tagTitles.Distinct().Select(EnsureTag);
        //     return tags;
        // }
        // Tag EnsureTag(string tagTitle) => db.Tags.FirstOrDefault(x => x.Title == tagTitle) ?? db.Tags.Add(new Tag { Title = tagTitle }).Entity;
        #endregion
    }

    // private static void CreateArchiveItem(MpaDbContext db)
    // {
    //     var archiveItem = new ArchiveItem
    //     {
    //         Title = "Something 1",
    //         // Tags = new List<Tag>([new Tag { Title = "tag1" }, new Tag { Title = "tag2" }, new Tag { Title = "tag3" }]),
    //         Created = DateTimeOffset.Now,
    //     };

    //     var fromEntity = db.ArchiveItems.Add(archiveItem).Entity;

    //     Console.WriteLine(fromEntity == archiveItem);

    //     foreach (var tag in EnsureTags("tag1", "tag3", "tag5"))
    //     {
    //         archiveItem.Tags.Add(tag);
    //     }
    // }

    // private static void CreateUser(MpaDbContext db)
    // {
    //     var jwtConfig = new JwtConfig{
    //         // JwtBearer = "",
    //         JwtIssuer = "",
    //         JwtSecret = "",
    //         // Audience = ""
    //     };

    //     var passwordHasher = new PasswordHasher(jwtConfig);
    //     var user = new User
    //     {
    //         Username = "admin",
    //         HashedPassword = passwordHasher.HashPassword("admin").hashedPassword,
    //         Salt = passwordHasher.HashPassword("Pa$$w0rd").salt,
    //         Tenants = [db.Tenants.Find(-1)!, new Tenant { Id = 2, Title = "Other tenant" }]
    //     };
    //     db.Users.Add(user);
    // }
}

internal class DummyAmbientDataResolver : AmbientDataResolver
{
    public override int? GetCurrentTenantId() => -1;

    public override string GetCurrentUsername() => "Dummy Username";
}
