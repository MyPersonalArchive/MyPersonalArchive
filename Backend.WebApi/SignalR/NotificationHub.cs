using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using Backend.Core.Infrastructure;

namespace Backend.WebApi.SignalR;


[Authorize]
public class NotificationHub : Hub
{
	private readonly IAmbientDataResolver _resolver;

	public NotificationHub(IAmbientDataResolver resolver)
	{
		_resolver = resolver;
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