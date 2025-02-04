// using Microsoft.IdentityModel.Tokens;
// using Backend.Api;
// using Backend.Api.SignalR;
// using Backend.Core.Configuration;
// using Backend.Core.Providers;
// using Backend.Core.Repositories;
// using Backend.Core.Models.Database;

using Backend.DbModel.Database;

namespace Backend.WebApi;

internal class WebApiAmbientDataResolver : AmbientDataResolver
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public WebApiAmbientDataResolver(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public override int GetCurrentTenantId()
    {
        var httpContext = _httpContextAccessor.HttpContext ?? throw new Exception("Unable to read http request headers");
        httpContext.Request.Headers.TryGetValue("tenantId", out var values);
        var tenantId = values.SingleOrDefault() ?? throw new Exception("Missing http request header: 'tenantId'");
        return int.Parse(tenantId);
    }
}
