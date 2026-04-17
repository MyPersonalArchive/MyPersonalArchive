namespace Backend.Core.Infrastructure;

public interface IAmbientDataResolver
{
    public int? GetCurrentTenantId();

    public string GetCurrentUsername();
}