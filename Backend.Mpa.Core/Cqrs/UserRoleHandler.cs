using Backend.Core.Cqrs.Infrastructure;
using Backend.Core.Infrastructure;
using Backend.Core.Services;


namespace Backend.Mpa.Core.Cqrs;


[RequireOrganizationId]
public class InviteUser : ICommand<InviteUser>
{
	public required string Email { get; set; }
	public required string FirstName { get; set; }
	public required string LastName { get; set; }
}


[RequireOrganizationId]
public class ResendInvitation : ICommand<ResendInvitation>
{
	public required string InvitationId { get; set; }
}


[RequireOrganizationId]
public class CancelInvitation : ICommand<CancelInvitation>
{
	public required string InvitationId { get; set; }
}


[RequireOrganizationId]
public class ListInvitations : IQuery<ListInvitations, IEnumerable<ListInvitations.Response>>
{
	// No parameters to get all pending invitations for the current organization

	public class Response
	{
		public required string Id { get; set; }
		public required string Email { get; set; }
		public required string Fullname { get; set; }
		public required DateTimeOffset ExpiresAt { get; set; }
	}
}


[RequireOrganizationId]
public class RemoveUser : ICommand<RemoveUser>
{
	public required string Subject { get; set; }
}


[RequireOrganizationId]
public class ListUsers : IQuery<ListUsers, IEnumerable<ListUsers.Response>>
{
	// No parameters to get all users for the current organization

	public class Response
	{
		public required string Issuer { get; set; }
		public required string Subject { get; set; }
		public required string Fullname { get; set; }
		public required IEnumerable<string> Roles { get; set; }
	}
}


public class UserRoleHandler :
	IAsyncCommandHandler<InviteUser>,
	IAsyncCommandHandler<ResendInvitation>,
	IAsyncCommandHandler<CancelInvitation>,
	IAsyncQueryHandler<ListInvitations, IEnumerable<ListInvitations.Response>>,
	IAsyncCommandHandler<RemoveUser>,
	IAsyncQueryHandler<ListUsers, IEnumerable<ListUsers.Response>>
{
	private readonly KeycloakOrganizationClient _keycloakClient;
	private readonly ISignalRService _signalRService;
	private readonly IAmbientDataResolver _ambientDataResolver;


	public UserRoleHandler(KeycloakOrganizationClient keycloakClient, ISignalRService signalRService, IAmbientDataResolver ambientDataResolver)
	{
		_keycloakClient = keycloakClient;
		_signalRService = signalRService;
		_ambientDataResolver = ambientDataResolver;
	}


	public async Task Handle(InviteUser command)
	{
		await _keycloakClient.InviteUserAsync(command.Email, command.FirstName, command.LastName);
		await PublishInvitationsUpdated();
	}


	public async Task Handle(ResendInvitation command)
	{
		await _keycloakClient.ResendInvitationAsync(command.InvitationId);
		await PublishInvitationsUpdated();
	}


	public async Task Handle(CancelInvitation command)
	{
		await _keycloakClient.DeleteInvitationAsync(command.InvitationId);
		await PublishInvitationsUpdated();
	}


	private Task PublishInvitationsUpdated() =>
		_signalRService.PublishToTenantChannel(new ISignalRService.Message("InvitationsUpdated", null));


	public async Task<IEnumerable<ListInvitations.Response>> Handle(ListInvitations query)
	{
		var invitations = await _keycloakClient.ListPendingInvitationsAsync();

		return invitations.Select(i => new ListInvitations.Response
		{
			Id = i.Id,
			Email = i.Email,
			Fullname = $"{i.FirstName} {i.LastName}",
			ExpiresAt = DateTimeOffset.FromUnixTimeSeconds(i.ExpiresAt)
		});
	}


	public async Task Handle(RemoveUser command)
	{
		if (command.Subject == _ambientDataResolver.GetCurrentUsername())
		{
			throw new HttpBadRequestException("You cannot remove yourself from the organization");
		}

		await _keycloakClient.RemoveMemberAsync(command.Subject);
		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("UsersUpdated", null));
	}


	public async Task<IEnumerable<ListUsers.Response>> Handle(ListUsers query)
	{
		var members = await _keycloakClient.ListOrganizationGroupMembersAsync();
		var owners = await _keycloakClient.ListOrganizationGroupMembersAsync(groupName: "Owner");
		var administrators = await _keycloakClient.ListOrganizationGroupMembersAsync(groupName: "Administrator");

		var ownerIds = owners.Select(o => o.Id).ToHashSet();
		var administratorIds = administrators.Select(a => a.Id).ToHashSet();

		return members.Select(m =>
		{
			var roles = new List<string>();
			if (ownerIds.Contains(m.Id))
				roles.Add("Owner");
			if (administratorIds.Contains(m.Id))
				roles.Add("Administrator");

			return new ListUsers.Response
			{
				Issuer = "//TODO: Get issuer from Keycloak config or ambient data",
				Subject = m.Id,
				Fullname = $"{m.FirstName} {m.LastName}",
				Roles = roles
			};
		});

	}

}
