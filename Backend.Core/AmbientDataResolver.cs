

namespace Backend.Core;

public abstract class AmbientDataResolver
{
    public abstract int? GetCurrentTenantId();

    public abstract string GetCurrentUsername();
}