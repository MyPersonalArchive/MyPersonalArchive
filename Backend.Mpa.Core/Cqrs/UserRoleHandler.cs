using Backend.Core.Cqrs.Infrastructure;
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

	public UserRoleHandler(UserRoleService userRoleService)
	{
		_userRoleService = userRoleService;
	}

	public async Task<IEnumerable<ListUsers.Response>> Handle(ListUsers query)
	{
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
