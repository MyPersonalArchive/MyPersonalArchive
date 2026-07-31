using System.Diagnostics;
using System.Security.Claims;
using Backend.Core.Infrastructure;

namespace Backend.WebApi;

[RegisterService(ServiceLifetime.Scoped)]
public class ClaimsAmbientDataResolver : IAmbientDataResolver
{
	private readonly IHttpContextAccessor _httpContextAccessor;

	public ClaimsAmbientDataResolver(IHttpContextAccessor httpContextAccessor)
	{
		_httpContextAccessor = httpContextAccessor;
	}


	public string? GetCurrentTenantId()
	{
		var httpContext = _httpContextAccessor.HttpContext ?? throw new Exception("Unable to read http request headers");

		var organizationClaim = httpContext.User.Claims.SingleOrDefault(claim => claim.Type == "organization")?.Value;
		Debug.WriteLine($"ClaimsAmbientDataResolver: GetCurrentTenantId() - organizationClaim: {organizationClaim}");
		return organizationClaim;
	}


	public string? GetCurrentUsername()
	{
		var httpContext = _httpContextAccessor.HttpContext ?? throw new Exception("Unable to read http request headers");
		var username = httpContext.User.Claims.SingleOrDefault(claim => ClaimTypes.NameIdentifier == claim.Type)?.Value;
		Debug.WriteLine($"ClaimsAmbientDataResolver: GetCurrentUsername() - username: {username}");

		return username;
	}

}
