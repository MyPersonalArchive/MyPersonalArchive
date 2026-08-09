using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Backend.Core.Infrastructure;
using Backend.Mpa.DbModel.Database;

namespace Backend.WebApi.SignalR;


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
		var tenantId = _resolver.GetCurrentTenantId();

		await Groups.AddToGroupAsync(Context.ConnectionId, $"tenantId={tenantId}");

		await base.OnConnectedAsync();
	}
	#endregion
}