using Microsoft.AspNetCore.SignalR;
using Backend.Core.Infrastructure;
using Backend.Core.Services;

namespace Backend.WebApi.SignalR;


[RegisterService(ServiceLifetime.Scoped)]
public class SignalRService : ISignalRService
{
	private readonly IHubContext<NotificationHub> _hubContext;
	private readonly int? _tenantId;
	private readonly string _username;

	public SignalRService(IHubContext<NotificationHub> hubContext, IAmbientDataResolver resolver)
	{
		_hubContext = hubContext;
		_tenantId = resolver.GetCurrentTenantId();
		_username = resolver.GetCurrentUsername();
	}


	#region SignalR server methods
	// public async Task PublishToSharedChannel(object data) => await PublishToSharedChannel(new Message(data));
	public async Task PublishToSharedChannel(ISignalRService.Message message)
	{
		await _hubContext.Clients.All.SendAsync("ReceiveMessage", message);
	}


	// public async Task PublishToTenantChannel(string messageName, object data) => await PublishToTenantChannel(new Message(messageName, data));
	public async Task PublishToTenantChannel(ISignalRService.Message message)
	{
		await _hubContext.Clients.Group($"tenantId={_tenantId}").SendAsync("ReceiveMessage", message);
	}


	// public async Task PublishToUserChannel(string messageName, object data) => await PublishToUserChannel(new Message(messageName, data));
	public async Task PublishToUserChannel(ISignalRService.Message message)
	{
		await _hubContext.Clients.Users(_username).SendAsync("ReceiveMessage", message);
	}
	#endregion
}
