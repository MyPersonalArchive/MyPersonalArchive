using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;


namespace Backend.Core.Cqrs.Infrastructure;


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