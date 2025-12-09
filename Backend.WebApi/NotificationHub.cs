using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using Backend.Core;
using Backend.DbModel.Database;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;
using Backend.DbModel.Database.EntityModels;

namespace Backend.WebApi;


[Authorize]
public class NotificationHub : Hub
{
    private readonly IAmbientDataResolver _resolver;
    private readonly MpaDbContext _dbContext;

    public NotificationHub(IAmbientDataResolver resolver, MpaDbContext dbContext)
    {
        _resolver = resolver;
        _dbContext = dbContext;
    }

    #region SignalR client methods
    public override async Task OnConnectedAsync()
    {
        var username = _resolver.GetCurrentUsername();
        if(!int.TryParse(Context.GetHttpContext()!.Request.Query["tenantId"], out var requestedTenantId))
        {
            throw new InvalidDataException("User does not have access to requested tenantId");
        }

        var userHasAccessToTenant = _dbContext.Users
            .Include(u => u.Tenants)
            .FirstOrDefault(u => u.Username == username)?
            .Tenants!.Any() ?? false;

        if (userHasAccessToTenant)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"tenantId={requestedTenantId}");
        }

        await base.OnConnectedAsync();
    }
    #endregion
}