using System.Diagnostics;


namespace Backend.WebApi.Middleware;


/// <summary>
///   Middleware to inject tenant ID from the "tenant-id" query parameter into the request headers for specific endpoints.
/// </summary>
/// <remarks>
///   This is needed when a request is initiated from outside our control, and thus is
///   missing the X-Tenant-Id header that we normally rely on for tenant identification.
///   A prime example of this is the OAuth callback endpoint, which is called by the external provider
///   after the user has authenticated. The browser redirect will not include the X-Tenant-Id header.
///   This middleware will look for a "tenant-id" query parameter.
///   We only want to do this for specific endpoints (like the OAuth callback endpoint) to avoid interfering with
///   other requests that might have a "tenant-id" parameter for different reasons.
/// </remarks>
public class TenantHeaderFromQueryStringMiddleware
{
	private readonly RequestDelegate _next;
	private readonly string[] _pathPrefixWhiteList;

	public TenantHeaderFromQueryStringMiddleware(RequestDelegate next, string[] pathPrefixWhiteList)
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

		if (!context.Request.Query.TryGetValue("tenant-id", out var tenantId))
		{
			throw new Exception("Missing tenant-id parameter. tenant-id parameter is required for this request.");
		}

		context.Request.Headers["X-Tenant-Id"] = tenantId;
		await _next(context);
	}
}
