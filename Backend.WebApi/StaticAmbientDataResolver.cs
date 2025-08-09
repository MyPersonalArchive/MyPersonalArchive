using Backend.Core;

public class StaticAmbientDataResolver : AmbientDataResolver
{
    private readonly int _tenantId;
    public StaticAmbientDataResolver(int tenantId)
    {
        _tenantId = tenantId;
    }

    public override int? GetCurrentTenantId() => _tenantId;

    public override string GetCurrentUsername() => "";
    
}