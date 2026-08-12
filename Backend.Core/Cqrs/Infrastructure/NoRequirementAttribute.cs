using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Backend.Core.Cqrs.Infrastructure;

[AttributeUsage(AttributeTargets.Class, Inherited = true, AllowMultiple = false)]
public class NoRequirementAttribute : RequireAuthenticationAttribute, IRequirement
{
	public override bool TryCheck(HttpContext httpContext, ILogger logger, out string? failureReason)
	{
		failureReason = null;
		return true;
	}
}
