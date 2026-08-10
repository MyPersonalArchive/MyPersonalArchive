using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http;


namespace Backend.Core.Cqrs.Infrastructure;

/// <summary>
/// Requires that the user has at least one of roles specified in the Roles property.
/// </summary>
[AttributeUsage(AttributeTargets.Class, Inherited = true, AllowMultiple = false)]
public class RequireRoleAttribute : RequireAuthenticationAttribute, IRequirement
{
	public string[] Roles { get; }

	public RequireRoleAttribute(params string[] roles)
	{
		Roles = roles;
	}

	public override bool TryCheck(HttpContext httpContext, ILogger logger, out string? failureReason)
	{
		// First, check authentication
		if (!base.TryCheck(httpContext, logger, out failureReason))
		{
			return false;
		}
		
		// Check if user is authenticated and has the role claim
		var user = httpContext.User;
		if (user.Identity?.IsAuthenticated ?? false)
		{
			var username = user.Identity?.Name;

			bool hasRole = Roles.Any(role => httpContext.User.IsInRole(role));
			if (!hasRole)
			{
				failureReason = "User does not have the required role";
				logger.LogWarning("User {Username} does not have the required role", username);
				return false;
			}

			failureReason = null;
			return true;
		}

		failureReason = $"User is not authenticated";
		logger.LogWarning("User is not authenticated");
		return false;
	}
}
