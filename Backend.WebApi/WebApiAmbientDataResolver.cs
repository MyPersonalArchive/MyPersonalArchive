// using Microsoft.IdentityModel.Tokens;
// using Backend.Api;
// using Backend.Api.SignalR;
// using Backend.Core.Configuration;
// using Backend.Core.Providers;
// using Backend.Core.Repositories;
// using Backend.Core.Models.Database;

using System.Security.Claims;
using Backend.Core;
using Backend.DbModel.Database;

namespace Backend.WebApi;

internal class WebApiAmbientDataResolver : AmbientDataResolver
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public WebApiAmbientDataResolver(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public override int? GetCurrentTenantId()
    {
        var httpContext = _httpContextAccessor.HttpContext ?? throw new Exception("Unable to read http request headers");
        httpContext.Request.Headers.TryGetValue("X-Tenant-Id", out var values);
        var tenantId = values.SingleOrDefault();

        return tenantId == null ? null : int.Parse(tenantId);
    }

    public override string? GetCurrentUsername()
    {
        var httpContext = _httpContextAccessor.HttpContext ?? throw new Exception("Unable to read http request headers");
        var username = httpContext.User.Claims.SingleOrDefault(claim => ClaimTypes.NameIdentifier == claim.Type)?.Value;

        return username;
    }

}
