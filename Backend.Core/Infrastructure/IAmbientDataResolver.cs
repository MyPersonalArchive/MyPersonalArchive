namespace Backend.Core.Infrastructure;

public interface IAmbientDataResolver
{
    public string? GetCurrentTenantId();

    public string? GetCurrentUsername();
}