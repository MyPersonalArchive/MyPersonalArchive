using Backend.Core.Infrastructure;
using Backend.Core.Providers.Store;
using Backend.Core.Services.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Mpa.Core.Services;


[RegisterService(ServiceLifetime.Scoped)]
public class UserRoleService : SettingsServiceBase<UserRoleSettings>
{
	protected override string FileName => "UserRoleSettings.json";


	public UserRoleService(TenantSettingsFileStoreFactory fileStoreFactory)
		: base(fileStoreFactory.GetFileStore())
	{
	}

	public async Task<UserRoleSettings> GetCurrentUserRolesAsync()
	{
		return await LoadSettingsAsync();
	}

	public async Task StoreCurrentUserRolesAsync(UserRoleSettings roles)
	{
		await SaveSettingsAsync(roles);
	}
}


public class UserRoleSettings : SettingsBase
{

	public List<User> Users { get; set; } = [];

	public class User
	{
		public required string Issuer { get; set; }
		public required string Subject { get; set; }
		public required string Fullname { get; set; }
		public required Role[] Roles { get; set; }
	}


	public enum Role
	{
		AccountOwner = 1,
		Administrator,
		User
	}
}
