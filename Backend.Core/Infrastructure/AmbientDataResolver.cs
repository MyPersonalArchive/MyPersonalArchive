namespace Backend.Core.Infrastructure;

public interface IAmbientDataResolver
{
    public abstract int? GetCurrentTenantId();

    public abstract string GetCurrentUsername();
}