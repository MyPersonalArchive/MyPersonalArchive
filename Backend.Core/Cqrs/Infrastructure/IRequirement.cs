using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http;


namespace Backend.Core.Cqrs.Infrastructure;


public interface IRequirement
{
	bool TryCheck(HttpContext httpContext, ILogger logger, out string? failureReason);
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