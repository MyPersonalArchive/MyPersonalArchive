using System.Security.Claims;
using Backend.Core;

namespace Backend.WebApi;

internal class WebApiAmbientDataResolver : AmbientDataResolver
{
	private readonly IHttpContextAccessor _httpContextAccessor;

	public WebApiAmbientDataResolver(IHttpContextAccessor httpContextAccessor)
	{
		_httpContextAccessor = httpContextAccessor;
	}

	public override int? GetCurrentTenantId()
	{
		var httpContext = _httpContextAccessor.HttpContext ?? throw new Exception("Unable to read http request headers");
		httpContext.Request.Headers.TryGetValue("X-Tenant-Id", out var values);
		var tenantId = values.SingleOrDefault();

		return tenantId == null ? null : int.Parse(tenantId);
	}

	public override string? GetCurrentUsername()
	{
		var httpContext = _httpContextAccessor.HttpContext ?? throw new Exception("Unable to read http request headers");
		var username = httpContext.User.Claims.SingleOrDefault(claim => ClaimTypes.NameIdentifier == claim.Type)?.Value;

		return username;
	}

}
