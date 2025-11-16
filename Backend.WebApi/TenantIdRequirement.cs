using Microsoft.AspNetCore.Authorization;


/// <summary>
/// Checks that the tenant ID provided in the "X-Tenant-Id" header is among the allowed tenants in the user's claims.
/// Requirement will fail if the tenant ID is not specifically allowed in the user's claims.
/// </summary>
public class TenantIdRequirement : IAuthorizationRequirement
{
}


// Handler
public class TenantIdRequirementsAuthorizationHandler : AuthorizationHandler<TenantIdRequirement>
{
	private readonly IHttpContextAccessor _httpContextAccessor;

	public TenantIdRequirementsAuthorizationHandler(IHttpContextAccessor httpContextAccessor)
	{
		_httpContextAccessor = httpContextAccessor;
	}

	protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, TenantIdRequirement requirement)
	{
		var httpContext = _httpContextAccessor.HttpContext;

		if (httpContext?.Request.Headers.TryGetValue("X-Tenant-Id", out var xTenantIdHeaderValues ) == true)
		{
			var userClaims = httpContext.User.Claims;
			var allowedTenants = userClaims.SingleOrDefault(claim => "AllowedTenants" == claim.Type)?.Value.Split(',') ?? [];

			if (allowedTenants.Contains(xTenantIdHeaderValues.ToString()))
			{
				context.Succeed(requirement);
			}
		}

		return Task.CompletedTask;
	}
}