using System.Linq.Expressions;
using Backend.Core;
using Backend.DbModel.Database.EntityModels;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Backend.DbModel.Database;

public class MpaDbContext : DbContext
{
    private readonly DbConfig _dbConfig;
    private readonly TenantId _tenantId;

    public MpaDbContext(IOptions<DbConfig> dbConfig, AmbientDataResolver resolver)
        : this(dbConfig.Value, resolver.GetCurrentTenantId() ?? throw new Exception("Missing tenant id."))
    {
    }

    public MpaDbContext(DbConfig dbConfig, int currentTenantId)
    {
        _dbConfig = dbConfig;
        _tenantId = new TenantId(currentTenantId);
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        Directory.CreateDirectory(_dbConfig.DatabaseFolder);
        string databaseFullFilename = Path.Combine(_dbConfig.DatabaseFolder, "MyPersonalArchive.db");
        optionsBuilder.UseSqlite($"Data Source={databaseFullFilename};foreign keys=true");
        optionsBuilder.EnableSensitiveDataLogging(true);
        optionsBuilder.LogTo(Console.WriteLine, [DbLoggerCategory.Database.Command.Name], LogLevel.Information);

        // This is required to support switching tenants at runtime, since OnModelCreating is only called once and then cached by EF Core
        optionsBuilder.ReplaceService<IModelCacheKeyFactory, MpaDbModelCacheKeyFactoryDesignTimeSupport>();

        base.OnConfiguring(optionsBuilder);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply global filter to enforce tenant isolation
        ConfigureTenantReadIsolation(modelBuilder);

        ConfigureEntityRelationships(modelBuilder);

        SeedDatabase(modelBuilder);
    }

    private void ConfigureTenantReadIsolation(ModelBuilder modelBuilder)
    {
        // Ensure that all entities implementing TenantEntity have a query filter applied to enforce tenant isolation
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(TenantEntity).IsAssignableFrom(entityType.ClrType))
            {
                var parameter = Expression.Parameter(entityType.ClrType, "e");
                var tenantIdValue = _tenantId;
                var filter = tenantIdValue == null
                    ? Expression.Lambda(Expression.Constant(false), parameter)
                    : Expression.Lambda(
                        Expression.Equal(
                            Expression.Property(parameter, nameof(TenantEntity.TenantId)),
                            Expression.Constant(tenantIdValue)
                        ),
                        parameter
                    );
                modelBuilder.Entity(entityType.ClrType).HasQueryFilter(filter);
            }
        }
    }

    private static void ConfigureEntityRelationships(ModelBuilder modelBuilder)
    {
        // Configure relationships between entities that are not automatically discovered by EF Core conventions
        modelBuilder.Entity<User>(builder =>
        {
            builder.Property(user => user.Id).HasConversion(id => id!.Value, v => new UserId(v));
            builder.HasAlternateKey(user => user.Username);
            builder.HasMany(user => user.Tenants)
                .WithMany(tenant => tenant.Users)
                .UsingEntity<UserTenant>(
                    l => l.HasOne<Tenant>().WithMany().HasForeignKey(userTenant => userTenant.TenantId),
                    r => r.HasOne<User>().WithMany().HasForeignKey(userTenant => userTenant.UserId)
                );
        });

        modelBuilder.Entity<UserTenant>(builder =>{
            builder.Property(UserTenant => UserTenant.UserId).HasConversion(id => id!.Value, v => new UserId(v));
            builder.Property(UserTenant => UserTenant.TenantId).HasConversion(id => id!.Value, v => new TenantId(v));
        });

        modelBuilder.Entity<Token>(builder =>
        {
            builder.Property(token => token.Id).HasConversion(id => id!.Value, v => new TokenId(v));
            builder.HasOne(token => token.User)
                .WithMany(user => user.Tokens)
                .HasForeignKey(token => token.Username)
                .HasPrincipalKey(user => user.Username);
        });

        modelBuilder.Entity<Tag>(builder =>
        {
            builder.Property(tag => tag.Id).HasConversion(id => id!.Value, v => new TagId(v));
            builder.Property(tenant => tenant.TenantId).HasConversion(id => id!.Value, v => new TenantId(v));
            builder.HasAlternateKey(tag => new { tag.Id, tag.TenantId });
        });

        modelBuilder.Entity<Tenant>(builder =>
        {
            builder.Property(tenant => tenant.Id).HasConversion(id => id!.Value, v => new TenantId(v));
        });

        modelBuilder.Entity<ArchiveItem>(builder =>
        {
            builder.Property(archiveItem => archiveItem.Id).HasConversion(id => id!.Value, v => new ArchiveItemId(v));
            builder.Property(archiveItem => archiveItem.TenantId).HasConversion(id => id!.Value, v => new TenantId(v));
            builder.HasAlternateKey(item => new { item.Id, item.TenantId });
            builder.HasMany(archiveItem => archiveItem.Tags)
                .WithMany(tag => tag.ArchiveItems)
                .UsingEntity<ArchiveItemAndTag>(
                    l => l.HasOne<Tag>().WithMany().HasForeignKey(m2m => new { m2m.TagId, m2m.TenantId }).HasPrincipalKey(tag => new { tag.Id, tag.TenantId }),
                    r => r.HasOne<ArchiveItem>().WithMany().HasForeignKey(m2m => new { m2m.ArchiveItemId, m2m.TenantId }).HasPrincipalKey(item => new { item.Id, item.TenantId })
                );
            builder.HasMany(archiveItem => archiveItem.Blobs)
                .WithOne(blob => blob.ArchiveItem)
                .HasPrincipalKey(archiveItem => new { archiveItem.Id, archiveItem.TenantId });
        });

        modelBuilder.Entity<Blob>(builder =>
        {
            builder.Property(blob => blob.Id).HasConversion(id => id!.Value, v => new BlobId(v));
            builder.Property(blob => blob.TenantId).HasConversion(id => id!.Value, v => new TenantId(v));
            builder.HasAlternateKey(blob => new { blob.Id, blob.TenantId });
        });
    }

    private void SeedDatabase(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Tenant>(tenants =>
        {
            tenants.HasData(
                new Tenant { Id = new TenantId(-1), Title = "Demo tenant" }
            );
        });

        modelBuilder.Entity<User>(users =>
        {
            users.HasData(
                new User { Id = new UserId(1), Username = "admin@localhost", Fullname = "administrator", HashedPassword = Convert.FromBase64String("QmGEqvYQRERIkSwjxzIjVHA8f81ycbynlvM4+nix5tM="), Salt = Convert.FromBase64String("AdWB+bSQNMYwJMrauW9Ibg==") }
            );
        });

        modelBuilder.Entity<UserTenant>(ut =>
        {
            ut.HasData(
                new UserTenant { UserId = new UserId(1), TenantId = new TenantId(-1) }
            );
        });

    }


    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        SetupChangeTrackingForSaveChanges();

        return base.SaveChanges(acceptAllChangesOnSuccess);
    }


    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        SetupChangeTrackingForSaveChanges();

        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    private void SetupChangeTrackingForSaveChanges()
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
            var tenantId = _tenantId ?? throw new Exception("Missing _tenantId. (Probable cause: missing the 'X-Tenant-Id' http request header.)");
            foreach (var entry in entries)
            {
                entry.Entity.TenantId = tenantId;
            }
        }
    }


    public DbSet<ArchiveItem> ArchiveItems { get; set; }
    public DbSet<Blob> Blobs { get; set; }
    public DbSet<Tag> Tags { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<Token> Tokens { get; set; }
    public DbSet<Tenant> Tenants { get; set; }
    public DbSet<ArchiveItemAndTag> ArchiveItemsAndTags { get; set; }


    public class MpaDbModelCacheKeyFactoryDesignTimeSupport : IModelCacheKeyFactory
    {
        public object Create(DbContext context, bool designTime)
            => context is MpaDbContext mpaDbContext
                ? (context.GetType(), mpaDbContext._tenantId, designTime)
                : (object)context.GetType();

        public object Create(DbContext context)
            => Create(context, false);
    }
}


