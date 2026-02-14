using System.Diagnostics;
using System.Text.Json;


namespace Backend.WebApi.Middleware;

/// <summary>
///   Middleware to inject tenant ID from the "state" query parameter (JSON) into the request headers for specific endpoints.
/// </summary>
/// <remarks>
///   This is needed when a request is initiated from outside our control, and thus is
///   missing the X-Tenant-Id header that we normally rely on for tenant identification.
///   A prime example of this is the OAuth callback endpoint, which is called by the external provider
///   after the user has authenticated. The browser redirect will not include the X-Tenant-Id header.
///   This middleware will look for a "state" query parameter, which is expected to be a JSON string containing the tenant ID.
///   We only want to do this for specific endpoints (like the OAuth callback endpoint) to avoid interfering with
///   other requests that might have a "state" parameter for different reasons.
/// </remarks>
public class TenantHeaderFromStateJsonMiddleware
{
	private readonly RequestDelegate _next;
	private readonly string[] _pathPrefixWhiteList;

	public TenantHeaderFromStateJsonMiddleware(RequestDelegate next, string[] pathPrefixWhiteList)
	{
		_next = next;
		_pathPrefixWhiteList = pathPrefixWhiteList;
	}

	public async Task InvokeAsync(HttpContext context)
	{
		if (!_pathPrefixWhiteList.Any(pathPrefix => context.Request.Path.StartsWithSegments(pathPrefix, StringComparison.OrdinalIgnoreCase)))
		{
			await _next(context);
			return;
		}

		if (context.Request.Query.TryGetValue("state", out var encodedState))
		{
			try
			{
				var state = JsonSerializer.Deserialize<AuthState>(Uri.UnescapeDataString(encodedState.ToString()), JsonSerializerOptions.Web);
				if (state != null && state.TenantId.HasValue)
				{
					context.Request.Headers["X-Tenant-Id"] = state.TenantId.Value.ToString();

					await _next(context);
					return;
				}
			}
			catch (JsonException)
			{
				throw new Exception("Invalid state parameter. Cannot extract tenant ID.");
			}
		}

		throw new Exception("Missing state parameter. State parameter is required for this request.");
	}

	class AuthState
	{
		public int? TenantId { get; set; }
	}
}
