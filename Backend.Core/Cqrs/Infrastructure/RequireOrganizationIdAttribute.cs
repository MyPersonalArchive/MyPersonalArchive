using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;


namespace Backend.Core.Cqrs.Infrastructure;

/// <summary>
/// Requires Organization claim to be present.
/// </summary>
[AttributeUsage(AttributeTargets.Class, Inherited = true, AllowMultiple = false)]
public class RequireOrganizationIdAttribute : RequireAuthenticationAttribute, IRequirement
{
	public override bool TryCheck(HttpContext httpContext, ILogger logger, out string? failureReason)
	{
		// First, check authentication
		if (!base.TryCheck(httpContext, logger, out failureReason))
		{
			return false;
		}
		
		// Check if user is authenticated and has the organization claim
		var user = httpContext.User;
		if (user.Identity?.IsAuthenticated ?? false)
		{
			var username = user.Identity?.Name;

			string? organizationClaim = httpContext.User.FindFirstValue("organization");
			if (string.IsNullOrWhiteSpace(organizationClaim))
			{
				failureReason = "User does not have an organization claim or it is empty";
				logger.LogWarning("User {Username} has an empty organization claim", username);
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
