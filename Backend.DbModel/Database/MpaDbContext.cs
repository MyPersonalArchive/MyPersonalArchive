using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Backend.DbModel.Database;

public class MpaDbContext : DbContext
{
    private readonly DbConfig _dbConfig;
    private readonly AmbientDataResolver _resolver;

    public MpaDbContext(IOptions<DbConfig> dbConfig, AmbientDataResolver resolver)
    {
        _dbConfig = dbConfig.Value;
        _resolver = resolver;
    }

    internal MpaDbContext(DbConfig dbConfig, AmbientDataResolver resolver)
    {
        _dbConfig = dbConfig;
        _resolver = resolver;
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        Directory.CreateDirectory(_dbConfig.DatabaseFolder);
        string databaseFullFilename = Path.Combine(_dbConfig.DatabaseFolder, "MyPersonalArchive.db");
        optionsBuilder.UseSqlite($"Data Source={databaseFullFilename};foreign keys=true");
        optionsBuilder.EnableSensitiveDataLogging(true);
        optionsBuilder.LogTo(Console.WriteLine, [DbLoggerCategory.Database.Command.Name], LogLevel.Information);

        base.OnConfiguring(optionsBuilder);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        var tenantId = _resolver.GetCurrentTenantId();

        // Apply global filter to enforce tenant isolation
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(TenantEntity).IsAssignableFrom(entityType.ClrType))
            {
                var parameter = Expression.Parameter(entityType.ClrType, "e");
                var filter = Expression.Lambda(
                    Expression.Equal(
                        Expression.Property(parameter, nameof(TenantEntity.TenantId)),
                        Expression.Constant(tenantId)
                    ),
                    parameter
                );
                modelBuilder.Entity(entityType.ClrType).HasQueryFilter(filter);
            }
        }

        modelBuilder.Entity<User>()
            .HasMany(e => e.Tokens)
            .WithOne(e => e.User)
            .HasPrincipalKey(e => e.Username);

        modelBuilder.Entity<User>()
            .HasMany(user => user.Tenants)
            .WithMany(tenant => tenant.Users)
            .UsingEntity<UserTenant>(
                l => l.HasOne<Tenant>().WithMany().HasForeignKey(e => e.TenantId),
                r => r.HasOne<User>().WithMany().HasForeignKey(e => e.UserId)
            );

        modelBuilder.Entity<ArchiveItem>()
            .HasMany(archiveItem => archiveItem.Tags)
            .WithMany(tag => tag.ArchiveItems)
            .UsingEntity<ArchiveItemAndTag>(
                l => l.HasOne<Tag>().WithMany().HasForeignKey(e => e.TagId),
                r => r.HasOne<ArchiveItem>().WithMany().HasForeignKey(e => e.ArchiveItemId)
            );

        #region Seed Data
        modelBuilder.Entity<Tenant>(tenants =>
        {
            tenants.HasData(
                new Tenant { Id = -1, Title = "Demo tenant" }
            );
        });

        modelBuilder.Entity<User>(users =>
        {
            users.HasData(
                new User { Id = 1, Username = "admin@localhost", Fullname = "administrator", HashedPassword = Convert.FromBase64String("QmGEqvYQRERIkSwjxzIjVHA8f81ycbynlvM4+nix5tM="), Salt = Convert.FromBase64String("AdWB+bSQNMYwJMrauW9Ibg==") }
            );
        });

        modelBuilder.Entity<ArchiveItem>(archiveItems =>
        {
            archiveItems.HasData(
                new ArchiveItem { Id = 1, Title = "First demo item", Created = new DateTimeOffset(2025, 2, 5, 12, 0, 0, TimeSpan.FromHours(-2)) },
                new ArchiveItem { Id = 2, Title = "Second demo item", Created = new DateTimeOffset(2025, 2, 5, 12, 15, 0, TimeSpan.FromHours(-2)) }
            );
        });

        #endregion
    }

    public override int SaveChanges()
    {
        var invalidEntities = ChangeTracker.Entries().Where(e => e.Entity is not (SharedEntity or TenantEntity));
        if (invalidEntities.Any())
        {
            throw new InvalidOperationException($"Only entities of type SharedEntity or TenantEntity are allowed. {string.Join(", ", invalidEntities.Select(e => e.Entity.GetType().Name))}");
        }


        var entries = ChangeTracker.Entries<TenantEntity>()
            .Where(e => e.State == EntityState.Added);
        if (entries.Any())
        {
            var tenantId = _resolver.GetCurrentTenantId();

            foreach (var entry in entries)
            {
                entry.Entity.TenantId = tenantId;
            }
        }

        return base.SaveChanges();
    }


    public DbSet<ArchiveItem> ArchiveItems { get; set; }
    public DbSet<Blob> Blobs { get; set; }
    public DbSet<Tag> Tags { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<Token> Tokens { get; set; }
    public DbSet<Tenant> Tenants { get; set; }
    public DbSet<ArchiveItemAndTag> ArchiveItemsAndTags { get; set; }
}
