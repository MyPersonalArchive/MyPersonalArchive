// See https://aka.ms/new-console-template for more information
using Backend.Core.Infrastructure;

internal class DummyAmbientDataResolver : IAmbientDataResolver
{
	public int? TenantId = null;
	public string? Username = null;
	
	public int? GetCurrentTenantId()
	{
		return TenantId;
	}

	public string? GetCurrentUsername()
	{
		return Username;
	}
}