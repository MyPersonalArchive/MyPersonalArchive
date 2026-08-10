using Backend.Core.Cqrs.Infrastructure;


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
		public required IEnumerable<string> Roles { get; set; }
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
