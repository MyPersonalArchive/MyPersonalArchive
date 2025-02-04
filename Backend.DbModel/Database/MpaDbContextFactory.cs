using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Backend.DbModel.Database;

/// <summary>
/// This factory is ONLY used by EF Core tools to create a DbContext instance at design time. It is NOT used by the application at runtime.
/// </summary>
/// <remarks>
/// Example usage:
/// ```
/// dotnet ef migrations add InitialCreate --project Backend.DbModel --startup-project Backend.WebApi
/// dotnet ef database update --project Backend.DbModel --startup-project Backend.WebApi
/// ```
/// </remarks>
public class MpaDbContextFactory : IDesignTimeDbContextFactory<MpaDbContext>
{
    public MpaDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<MpaDbContext>();
        optionsBuilder.UseSqlite("Data Source=blog.db");

        var dbConfig = new DbConfig { DatabaseFolder = "/data/Database" };
        var resolver = new DummyAmbientDataResolver();
        return new MpaDbContext(dbConfig, resolver);
    }

    public class DummyAmbientDataResolver : AmbientDataResolver
    {
        public override int GetCurrentTenantId()
        {
            return 0;
        }
    }
}