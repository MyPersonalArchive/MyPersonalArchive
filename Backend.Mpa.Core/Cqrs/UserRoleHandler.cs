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
		public required UserRoleSettings.Role[] Roles { get; set; }
	}
}


public class UserRoleHandler :
	IAsyncQueryHandler<ListUsers, IEnumerable<ListUsers.Response>>
{
	private readonly UserRoleService _userRoleService;
	private readonly KeycloakOrgGroupClient _keycloakClient;
	private readonly IAmbientDataResolver ambientDataResolver;

	public UserRoleHandler(UserRoleService userRoleService, KeycloakOrgGroupClient keycloakClient, IAmbientDataResolver ambientDataResolver)
	{
		_userRoleService = userRoleService;
		_keycloakClient = keycloakClient;
		this.ambientDataResolver = ambientDataResolver;
	}

	public async Task<IEnumerable<ListUsers.Response>> Handle(ListUsers query)
	{
		//TODO: returns 404 not found. Why???
		var owners = await _keycloakClient.GetOwnerGroupMembersAsync(
			realm: "my-personal-archive",
			orgId: ambientDataResolver.GetCurrentTenantId()!,
			groupName: "Owner");



		var userRoleSettings = await _userRoleService.GetCurrentUserRolesAsync();

		return userRoleSettings!.Users.Select(u => new ListUsers.Response
		{
			Issuer = u.Issuer,
			Subject = u.Subject,
			Fullname = u.Fullname,
			Roles = u.Roles
		});
	}

}
