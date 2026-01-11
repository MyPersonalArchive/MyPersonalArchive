namespace Backend.WebApi.CqrsInfrastructure;


public interface IRequirement
{
	bool TryCheck(HttpContext httpContext, ILogger logger, out string? failureReason);
}


/// <summary>
/// Requires the user to be authenticated to execute the query or command.
/// </summary>
[AttributeUsage(AttributeTargets.Class, Inherited = true, AllowMultiple = false)]
public class RequireAuthenticationAttribute : Attribute, IRequirement
{
	public bool UserMustBeAuthorized { get; set; } = true;

	public virtual bool TryCheck(HttpContext httpContext, ILogger logger, out string? failureReason)
	{
		if (UserMustBeAuthorized && (!httpContext.User.Identity?.IsAuthenticated ?? true))
		{
			failureReason = "Authentication required";
			logger.LogWarning("Authentication check failed");
			return false;
		}

		logger.LogDebug($"Authentication check passed. Username: {httpContext.User.Identity?.Name}");

		failureReason = null;
		return true;
	}
}


/// <summary>
/// Requires the X-Tenant-Id header to be present, valid, and in the user's allowed tenants list.
/// </summary>
[AttributeUsage(AttributeTargets.Class, Inherited = true, AllowMultiple = false)]
public class RequireAllowedTenantIdAttribute : RequireAuthenticationAttribute, IRequirement
{
	public override bool TryCheck(HttpContext httpContext, ILogger logger, out string? failureReason)
	{
		// First, check authentication
		if (!base.TryCheck(httpContext, logger, out failureReason))
		{
			return false;
		}

		if (!httpContext.Request.Headers.TryGetValue("X-Tenant-Id", out var tenantIdValue))
		{
			failureReason = "X-Tenant-Id header is required";
			logger.LogWarning("X-Tenant-Id header missing");
			return false;
		}

		if (!int.TryParse(tenantIdValue, out var tenantId) /*|| tenantId <= 0*/)
		{
			failureReason = "X-Tenant-Id header must be a valid integer";
			logger.LogWarning("X-Tenant-Id header invalid: {TenantId}", tenantIdValue);
			return false;
		}

		// Check if user is authenticated and has access to this tenant
		var user = httpContext.User;
		if (user.Identity?.IsAuthenticated ?? false)
		{
			var allowedTenantsClaim = user.FindFirst("AllowedTenants")?.Value;
			if (!string.IsNullOrEmpty(allowedTenantsClaim))
			{
				var allowedTenants = allowedTenantsClaim.Split(',', StringSplitOptions.RemoveEmptyEntries)
					.Select(t => int.TryParse(t.Trim(), out var id) ? id : (int?)null)
					.Where(id => id != null)
					.ToList();

				if (!allowedTenants.Contains(tenantId))
				{
					failureReason = $"User does not have access to tenant {tenantId}";
					logger.LogWarning("User does not have access to tenant {TenantId}. Allowed tenants: {AllowedTenants}",
						tenantId, allowedTenantsClaim);
					return false;
				}
			}
		}

		failureReason = null;
		return true;
	}
}


// /// <summary>
// /// This requirement fails or passes based on the ShouldPass property. False means it fails.
// /// </summary>
// [AttributeUsage(AttributeTargets.Class, Inherited = true, AllowMultiple = false)]
// public class ArjansRequirementAttribute : Attribute
// {
// 	public bool ShouldPass { get; }

// 	public ArjansRequirementAttribute(bool isRequired)
// 	{
// 		ShouldPass = isRequired;
// 	}

// 	public bool TryCheck(IServiceProvider services, ILogger logger, out string? failureReason)
// 	{
// 		if (!ShouldPass)
// 		{
// 			failureReason = "Requirement not met.";
// 			return false;
// 		}

// 		failureReason = null;
// 		return true;
// 	}
// }