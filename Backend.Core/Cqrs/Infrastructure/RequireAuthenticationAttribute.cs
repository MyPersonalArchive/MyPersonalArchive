using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http;


namespace Backend.Core.Cqrs.Infrastructure;

/// <summary>
/// Requires the user to be authenticated to execute the query or command.
/// </summary>
[AttributeUsage(AttributeTargets.Class, Inherited = true, AllowMultiple = false)]
public class RequireAuthenticationAttribute : Attribute, IRequirement
{

	public virtual bool TryCheck(HttpContext httpContext, ILogger logger, out string? failureReason)
	{
		if (!(httpContext.User.Identity?.IsAuthenticated ?? false))
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
