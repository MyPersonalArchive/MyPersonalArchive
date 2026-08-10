using System.Security.Claims;
using Backend.Core.Cqrs.Infrastructure;

namespace Backend.WebApi.Cqrs;

[RequireAuthentication(UserMustBeAuthorized = true)]
public class GetCurrentUserInfo : IQuery<GetCurrentUserInfo, GetCurrentUserInfo.Response>
{
	public int MyProperty { get; set; }

	public class Response
	{
		public required string Username { get; set; }
		public required string Fullname { get; set; }
		public required string? TenantId { get; set; }
		public required IEnumerable<string> Roles { get; set; }
	}
}

public class CurrentUserInfoHandler : IQueryHandler<GetCurrentUserInfo, GetCurrentUserInfo.Response>
{
	private readonly IHttpContextAccessor _httpContextAccessor;

	public CurrentUserInfoHandler(IHttpContextAccessor httpContextAccessor)
	{
		_httpContextAccessor = httpContextAccessor;
	}


	public GetCurrentUserInfo.Response Handle(GetCurrentUserInfo query)
	{
		var httpContext = _httpContextAccessor.HttpContext ?? throw new Exception("Unable to read http request headers");
		var user = httpContext.User;

		var username = user.FindFirstValue(ClaimTypes.NameIdentifier);
		var fullname = user.FindFirstValue(ClaimTypes.GivenName);
		var organization = user.FindFirstValue("organization");
		var roles = user.FindAll(ClaimTypes.Role).Select(claim => claim.Value);

		return new GetCurrentUserInfo.Response
		{
			Username = username!,
			Fullname = fullname!,
			TenantId = organization,
			Roles = roles
		};
	}
}
