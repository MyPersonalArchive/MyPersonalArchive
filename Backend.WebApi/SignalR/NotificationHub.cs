using System.Security.Claims;
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
		var tenantId = _resolver.GetCurrentTenantId();

		if (!string.IsNullOrEmpty(tenantId))
		{
			await Groups.AddToGroupAsync(Context.ConnectionId, TenantGroup(tenantId));

			foreach (var role in Context.User?.FindAll(ClaimTypes.Role) ?? [])
			{
				await Groups.AddToGroupAsync(Context.ConnectionId, TenantRoleGroup(tenantId, role.Value));
			}
		}

		await base.OnConnectedAsync();
	}
	#endregion


	internal static string TenantGroup(string tenantId) => $"tenantId={tenantId}";

	internal static string TenantRoleGroup(string tenantId, string role) => $"{TenantGroup(tenantId)}:role={role}";
}