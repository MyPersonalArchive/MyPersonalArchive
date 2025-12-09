

namespace Backend.Core;

public interface IAmbientDataResolver
{
    public abstract int? GetCurrentTenantId();

    public abstract string GetCurrentUsername();
}