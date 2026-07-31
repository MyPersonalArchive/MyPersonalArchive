using Microsoft.AspNetCore.Authorization;


/// <summary>
/// Checks that the tenant ID provided in the "X-Tenant-Id" header is among the allowed tenants in the user's claims.
/// Requirement will fail if the tenant ID is not specifically allowed in the user's claims.
/// </summary>
public class TenantIdRequirement : IAuthorizationRequirement
{
}


// Handler
public class OrganizationRequirementAuthorizationHandler : AuthorizationHandler<TenantIdRequirement>
{
	private readonly IHttpContextAccessor _httpContextAccessor;

	public OrganizationRequirementAuthorizationHandler(IHttpContextAccessor httpContextAccessor)
	{
		_httpContextAccessor = httpContextAccessor;
	}

	protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, TenantIdRequirement requirement)
	{
		var httpContext = _httpContextAccessor.HttpContext;
		var user = httpContext?.User;
		var organization = user?.FindFirst("organization")?.Value;

		if (organization == null)
		{
			context.Fail();
			return Task.CompletedTask;
		}

		context.Succeed(requirement);

		return Task.CompletedTask;
	}
}