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
        var dbConfig = new DbConfig { DatabaseFolder = "/data/Database" };
        return new MpaDbContext(dbConfig, 0);
    }
}