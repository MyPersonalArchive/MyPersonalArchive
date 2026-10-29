using Backend.Core.Cqrs.Infrastructure;
using Backend.Core.Infrastructure;
using Backend.Core.Services;


namespace Backend.Mpa.Core.Cqrs;


[RequireOrganizationId]
[RequireRole("Administrator")]
public class InviteUser : ICommand<InviteUser>
{
	public required string Email { get; set; }
	public required string FirstName { get; set; }
	public required string LastName { get; set; }
}


[RequireOrganizationId]
[RequireRole("Administrator")]
public class ResendInvitation : ICommand<ResendInvitation>
{
	public required string InvitationId { get; set; }
}


[RequireOrganizationId]
[RequireRole("Administrator")]
public class CancelInvitation : ICommand<CancelInvitation>
{
	public required string InvitationId { get; set; }
}


[RequireOrganizationId]
[RequireRole("Administrator")]
public class RemoveUser : ICommand<RemoveUser>
{
	public required string Subject { get; set; }
}


[RequireOrganizationId]
[RequireRole("Administrator")]
public class ChangeUserRole : ICommand<ChangeUserRole>
{
	public required string Subject { get; set; }

	/// <summary>"Administrator" or "User"</summary>
	public required string Role { get; set; }
}


[RequireOrganizationId]
[RequireRole("Owner")]
public class TransferOwnership : ICommand<TransferOwnership>
{
	public required string NewOwnerSubject { get; set; }
	public required PaymentDetails NewPaymentDetails { get; set; }
	public required string Subject { get; set; }

	public class PaymentDetails
	{
		public required string CardNumber { get; set; }
		public required string ExpiryDate { get; set; }
		public required string Cvc { get; set; }
		public required string CardholderName { get; set; }
	}
}


[RequireOrganizationId]
[RequireRole("Administrator")]
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
[RequireRole("Administrator")]
public class ListUsers : IQuery<ListUsers, IEnumerable<ListUsers.Response>>
{
	// No parameters to get all users for the current organization

	public class Response
	{
		public required string Issuer { get; set; }
		public required string Subject { get; set; }
		public required string Fullname { get; set; }
		public string? Email { get; set; }
		public required IEnumerable<string> Roles { get; set; }
	}
}


public class UserRoleHandlers :
	IAsyncCommandHandler<InviteUser>,
	IAsyncCommandHandler<ResendInvitation>,
	IAsyncCommandHandler<CancelInvitation>,
	IAsyncCommandHandler<RemoveUser>,
	IAsyncCommandHandler<ChangeUserRole>,
	IAsyncCommandHandler<TransferOwnership>,
	IAsyncQueryHandler<ListInvitations, IEnumerable<ListInvitations.Response>>,
	IAsyncQueryHandler<ListUsers, IEnumerable<ListUsers.Response>>
{
	private readonly KeycloakOrganizationClient _keycloakClient;
	private readonly ISignalRService _signalRService;
	private readonly IAmbientDataResolver _ambientDataResolver;


	public UserRoleHandlers(KeycloakOrganizationClient keycloakClient, ISignalRService signalRService, IAmbientDataResolver ambientDataResolver)
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


	public async Task Handle(RemoveUser command)
	{
		if (command.Subject == _ambientDataResolver.GetCurrentUsername())
		{
			throw new HttpBadRequestException("You cannot remove yourself from the organization");
		}

		if (await IsOwnerAsync(command.Subject))
		{
			throw new HttpBadRequestException("A user with the Owner role cannot be removed from the organization");
		}

		await _keycloakClient.RemoveMemberAsync(command.Subject);
		await PublishUsersUpdated();
	}


	public async Task Handle(ChangeUserRole command)
	{
		if (await IsOwnerAsync(command.Subject))
		{
			throw new HttpBadRequestException("The role of a user with the Owner role cannot be changed");
		}

		switch (command.Role)
		{
			case "Administrator":
				await _keycloakClient.AddMemberToGroupAsync("Administrator", command.Subject);
				break;
			case "User":
				await _keycloakClient.RemoveMemberFromGroupAsync("Administrator", command.Subject);
				break;
			default:
				throw new HttpBadRequestException($"Unknown role '{command.Role}'");
		}

		await PublishUsersUpdated();
	}


	private async Task<bool> IsOwnerAsync(string subject)
	{
		var owners = await _keycloakClient.ListOrganizationGroupMembersAsync(groupName: "Owner");
		return owners.Exists(o => o.Id == subject);
	}


	public async Task Handle(TransferOwnership command)
	{
		if (command.NewOwnerSubject == _ambientDataResolver.GetCurrentUsername())
		{
			throw new HttpBadRequestException("You cannot transfer ownership to yourself");
		}

		// TODO: Implement the actual transfer of ownership logic
		// - Remove the current owner from the "Owner" group
		// - Add the new owner to the "Owner" group
		// - Enforce that there is exactly one owner at all times
		// - If the organization is on a paid plan, ensure that billing is updated accordingly
		//   - Change payment details to be associated with the new owner

		await PublishUsersUpdated();

		throw new HttpBadRequestException("Transfer of ownership is not yet implemented");
	}


	private Task PublishUsersUpdated() =>
		_signalRService.PublishToTenantRoleChannel("Administrator", new ISignalRService.Message("UsersUpdated", null));


	private Task PublishInvitationsUpdated() =>
		_signalRService.PublishToTenantRoleChannel("Administrator", new ISignalRService.Message("InvitationsUpdated", null));


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
				Email = m.Email,
				Roles = roles
			};
		});

	}

}
