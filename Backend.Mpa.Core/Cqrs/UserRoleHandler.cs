using Backend.Core.Cqrs.Infrastructure;
using Backend.Core.Infrastructure;
using Backend.Mpa.Core.Services;


namespace Backend.Mpa.Core.Cqrs;


[RequireOrganizationId]
public class ListUsers : IQuery<ListUsers, IEnumerable<ListUsers.Response>>
{
	// No parameters to get all users for the current organization

	public class Response
	{
		public required string Issuer { get; set; }
		public required string Subject { get; set; }
		public required string Fullname { get; set; }
		public required Role[] Roles { get; set; }

		public enum Role
		{
			Owner = 1,
			Administrator,
			User
		}
	}
}


public class UserRoleHandler :
	IAsyncQueryHandler<ListUsers, IEnumerable<ListUsers.Response>>
{
	private readonly KeycloakOrganizationClient _keycloakClient;


	public UserRoleHandler(KeycloakOrganizationClient keycloakClient)
	{
		_keycloakClient = keycloakClient;
	}


	public async Task<IEnumerable<ListUsers.Response>> Handle(ListUsers query)
	{
		var members = await _keycloakClient.ListOrganizationGroupMembersAsync();
		var owners = await _keycloakClient.ListOrganizationGroupMembersAsync(groupName: "Owner");

		return members.Select(m => new ListUsers.Response
		{
			Issuer = "//TODO: Get issuer from Keycloak config or ambient data",
			Subject = m.Id,
			Fullname = $"{m.FirstName} {m.LastName}",
			Roles = owners.Any(o => o.Id == m.Id)
				? [ListUsers.Response.Role.Owner, ListUsers.Response.Role.User]
				: [ListUsers.Response.Role.User]
		});

	}

}
