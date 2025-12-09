using System.Linq.Expressions;
using System.Text.Json;
using System.Text.Json.Nodes;
using Backend.Core;
using Backend.DbModel.Database.EntityModels;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Backend.DbModel.Database;

public class MpaDbContext : DbContext
{
	private readonly DbConfig _dbConfig;
	private readonly int? _tenantId;

	public MpaDbContext(IOptions<DbConfig> dbConfig, IAmbientDataResolver resolver)
		: this(dbConfig.Value, resolver.GetCurrentTenantId())
	{
	}

	public MpaDbContext(DbConfig dbConfig, int? currentTenantId)
	{
		_dbConfig = dbConfig;
		_tenantId = currentTenantId;
	}

	protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
	{
		// optionsBuilder.ConfigureWarnings(warnings => warnings.Ignore(RelationalEventId.PendingModelChangesWarning));
		// optionsBuilder.LogTo(Console.WriteLine, [DbLoggerCategory.Database.Command.Name], LogLevel.Information);

		Directory.CreateDirectory(_dbConfig.DatabaseFolder);
		string databaseFullFilename = Path.Combine(_dbConfig.DatabaseFolder, "MyPersonalArchive.db");
		optionsBuilder.UseSqlite($"Data Source={databaseFullFilename};foreign keys=true");
		optionsBuilder.EnableSensitiveDataLogging(true);

		// This is required to support switching tenants at runtime, since OnModelCreating is only called once and then cached by EF Core
		optionsBuilder.ReplaceService<IModelCacheKeyFactory, MpaDbModelCacheKeyFactoryDesignTimeSupport>();

		base.OnConfiguring(optionsBuilder);
	}


	protected override void OnModelCreating(ModelBuilder modelBuilder)
	{
		base.OnModelCreating(modelBuilder);

		// Apply global filter to enforce tenant isolation
		ConfigureTenantReadIsolation(modelBuilder);

		ConfigureTypeConversions(modelBuilder);

		ConfigureEntityRelationships(modelBuilder);

		SeedDatabase(modelBuilder);
	}

	private void ConfigureTenantReadIsolation(ModelBuilder modelBuilder)
	{
		// Ensure that all entities implementing TenantEntity have a query filter applied to enforce tenant isolation
		// Tenant isolation ensures that no data leaks between tenants.
		// Note that tenant isolation does not control access to data. It only ensures that queries are automatically filtered by current tenant ID.
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

	private void ConfigureTypeConversions(ModelBuilder modelBuilder)
	{
		var _jsonSerializerOptions = new JsonSerializerOptions
		{
			PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
		};
		modelBuilder.Entity<ArchiveItem>()
			.Property(e => e.Metadata)
			.HasConversion(
				v => v.ToJsonString(_jsonSerializerOptions),
				v => JsonSerializer.Deserialize<JsonObject>(v, _jsonSerializerOptions) ?? new JsonObject(new JsonNodeOptions())
			)
			.HasColumnType("TEXT");
	}

	private static void ConfigureEntityRelationships(ModelBuilder modelBuilder)
	{
		// Configure relationships between entities that are not automatically discovered by EF Core conventions
		modelBuilder.Entity<User>(builder =>
		{
			builder.HasAlternateKey(user => user.Username);

			builder.HasMany(user => user.Tenants)
				.WithMany(tenant => tenant.Users)
				.UsingEntity<UserTenant>(
					l => l.HasOne<Tenant>().WithMany().HasForeignKey(userTenant => userTenant.TenantId),
					r => r.HasOne<User>().WithMany().HasForeignKey(userTenant => userTenant.UserId)
				);
		});

		modelBuilder.Entity<UserTenant>(builder =>
		{
		});

		
		modelBuilder.Entity<Tag>(builder =>
		{
			builder.HasAlternateKey(tag => new { tag.Id, tag.TenantId });
		});

		modelBuilder.Entity<Tenant>(builder =>
		{
		});

		modelBuilder.Entity<ArchiveItem>(builder =>
		{
			builder.HasAlternateKey(item => new { item.Id, item.TenantId });

			//HERE
			builder.HasOne(archiveItem => archiveItem.CreatedBy)
				.WithMany()
				.HasForeignKey(archiveItem => archiveItem.CreatedByUsername)
				.HasPrincipalKey(user => user.Username);

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
			builder.HasAlternateKey(blob => new { blob.Id, blob.TenantId });

			//HERE
			builder.HasOne(blob => blob.UploadedBy)
				.WithMany()
				.HasForeignKey(blob => blob.UploadedByUsername)
				.HasPrincipalKey(user => user.Username);
		});
	}

	private void SeedDatabase(ModelBuilder modelBuilder)
	{
		modelBuilder.Entity<Tenant>(tenants =>
		{
			tenants.HasData(
				new Tenant { Id = -1, Title = "Demo tenant" },
				new Tenant { Id = 1, Title = "Bergen tenant" },
				new Tenant { Id = 2, Title = "Göteborg tenant" },
				new Tenant { Id = 3, Title = "Odense tenant" }
			);
		});

		modelBuilder.Entity<StoredFilter>(storedFilters =>
		{
			storedFilters.HasData(
				new StoredFilter { Id = -1, Name="No filters", TenantId = -1, Title = "", Tags = [], MetadataTypes = [] },
				new StoredFilter { Id = 1, Name="No filters", TenantId = -1, Title = "", Tags = [], MetadataTypes = [] },
				new StoredFilter { Id = 2, Name="No filters", TenantId = -1, Title = "", Tags = [], MetadataTypes = [] },
				new StoredFilter { Id = 3, Name="No filters", TenantId = -1, Title = "", Tags = [], MetadataTypes = [] }
			);
		});

		modelBuilder.Entity<User>(users =>
		{
			users.HasData(
				new User { Id = 1, Username = "admin@localhost", Fullname = "Administrator", HashedPassword = Convert.FromBase64String("QmGEqvYQRERIkSwjxzIjVHA8f81ycbynlvM4+nix5tM="), Salt = Convert.FromBase64String("AdWB+bSQNMYwJMrauW9Ibg==") },
				new User { Id = 2, Username = "arjan@localhost", Fullname = "Arjan", HashedPassword = Convert.FromBase64String("GsvRPZ+/Nvh5k6OF+GwhBn172mFD0dN8qwBtA54CqII="), Salt = Convert.FromBase64String("S/QxVyyNjFijqftxtN69Iw==") },
				new User { Id = 3, Username = "stian@localhost", Fullname = "Stian", HashedPassword = Convert.FromBase64String("nwX3O9gTRAh8P0SnHo/vfV9jxFD272MflikCAU2kIuw="), Salt = Convert.FromBase64String("ZAAcuZXGK8v1sQQVvLesfQ==") }
			);
		});

		modelBuilder.Entity<UserTenant>(ut =>
		{
			ut.HasData(
				new UserTenant { UserId = 1, TenantId = -1 },
				new UserTenant { UserId = 1, TenantId = 1 },
				new UserTenant { UserId = 1, TenantId = 2 },
				new UserTenant { UserId = 2, TenantId = 1 },
				new UserTenant { UserId = 2, TenantId = 3 },
				new UserTenant { UserId = 3, TenantId = 2 }
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
		AssertAllEntitiesAreSharedEntityOrTenantEntity();

		// Entity-specific logic before saving changes to the database

		//TODO:
		// - When a ArchiveItem is deleted, also delete all associated ArchiveItemAndTag entries.
		// - Remove the Tag from the DbSet<Tag> if it is not used by any other ArchiveItem.

		// General checks and setups before saving changes to the database
		SetTenantIdForNewEntities();
		AssertTenantIdForChanges();
	}


	private void SetTenantIdForNewEntities()
	{
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


	private void AssertTenantIdForChanges()
	{
		// Ensure that no entities of type TenantEntity are modified or deleted across tenant boundaries
		var modifiedEntries = ChangeTracker.Entries<TenantEntity>()
			.Where(e => e.State == EntityState.Modified || e.State == EntityState.Deleted);
		if (modifiedEntries.Any())
		{
			var tenantId = _tenantId ?? throw new Exception("Missing _tenantId. (Probable cause: missing the 'X-Tenant-Id' http request header.)");
			if (modifiedEntries.Any(e => e.Entity.TenantId != tenantId))
			{
				throw new InvalidOperationException($"Cannot modify or delete TenantEntity across tenant boundaries.");
			}
		}
	}


	private void AssertAllEntitiesAreSharedEntityOrTenantEntity()
	{
		var invalidEntities = ChangeTracker.Entries().Where(e => e.Entity is not (SharedEntity or TenantEntity));
		if (invalidEntities.Any())
		{
			throw new InvalidOperationException($"Only entities of type SharedEntity or TenantEntity are allowed. The following entities are invalid:{string.Join(", ", invalidEntities.Select(e => e.Entity.GetType().Name))}");
		}
	}


	public DbSet<ArchiveItem> ArchiveItems { get; set; }
	public DbSet<Blob> Blobs { get; set; }
	public DbSet<Tag> Tags { get; set; }
	public DbSet<User> Users { get; set; }
	public DbSet<Tenant> Tenants { get; set; }
	public DbSet<ArchiveItemAndTag> ArchiveItemsAndTags { get; set; }
	public DbSet<StoredFilter> StoredFilters { get; set; }


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


