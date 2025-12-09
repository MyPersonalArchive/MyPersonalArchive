using Backend.Core;

public class StaticAmbientDataResolver : IAmbientDataResolver
{
    private readonly int _tenantId;
    public StaticAmbientDataResolver(int tenantId)
    {
        _tenantId = tenantId;
    }

    public int? GetCurrentTenantId() => _tenantId;

    public string GetCurrentUsername() => "";
    
}