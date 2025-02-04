
namespace Backend.DbModel.Database;

public abstract class AmbientDataResolver
{
    public abstract int GetCurrentTenantId();
}