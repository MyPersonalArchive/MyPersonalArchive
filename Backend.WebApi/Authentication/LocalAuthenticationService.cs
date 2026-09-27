using Backend.Core.Infrastructure;
using Backend.Core.Providers.Store;
using Backend.Core.Services;
using Backend.Core.Services.Infrastructure;
using Backend.WebApi.SignalR;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.WebApi.Authentication;

[RegisterService(ServiceLifetime.Scoped)]
public class LocalAuthenticationService : SettingsServiceBase<AuthenticationSettings>
{
	protected override string FileName => "AuthenticationSettings.json";

	public LocalAuthenticationService(SystemSettingsFileStoreFactory fileStoreFactory)
		: base(fileStoreFactory.GetFileStore())
	{
	}


	public async Task<AuthenticationSettings.User?> GetUserAsync(string username)
	{
		var settings = await LoadSettingsAsync();
		return settings.Users.SingleOrDefault(u => u.Username == username);
	}


	public async Task AddOrReplace(AuthenticationSettings.User user)
	{
		await ChangeSettingsAsync(settings =>
		{
			// If a user with the same username exists, replace it. Otherwise, add the new account.
			var index = settings.Users.FindIndex(a => a.Username == user.Username);
			if (index != -1)
			{
				settings.Users[index] = user;
			}
			else
			{
				settings.Users.Add(user);
			}
			return settings;
		});
	}

}


public class AuthenticationSettings : SettingsBase
{
	public List<User> Users { get; set; } = [];

	public class User
	{
		public required string Username { get; set; }

		public required string Fullname { get; set; }

		public byte[]? HashedPassword { get; set; }

		public byte[]? Salt { get; set; }
		public string[] Roles { get; set; } = [];
	}
}


#region sample data for Owner/AuthenticationSettings.json
// The passwords for the sample users are:
// - username: admin@localhost, password: p@$$w0rd
// - username: arjan@localhost, password: pass
// - username: stian@localhost, password: word
/*
{
  "users": [
    {
      "username": "admin@localhost",
      "fullname": "Administrator",
      "hashedPassword": "QmGEqvYQRERIkSwjxzIjVHA8f81ycbynlvM4+nix5tM=",
      "salt": "AdWB+bSQNMYwJMrauW9Ibg==",
      "roles": ["Owner", "Admin"]
    },
    {
      "username": "arjan@localhost",
      "fullname": "Arjan",
      "hashedPassword": "GsvRPZ+/Nvh5k6OF+GwhBn172mFD0dN8qwBtA54CqII=",
      "salt": "S/QxVyyNjFijqftxtN69Iw==",
      "roles": ["User"]
    },
    {
      "username": "stian@localhost",
      "fullname": "Stian",
      "hashedPassword": "nwX3O9gTRAh8P0SnHo/vfV9jxFD272MflikCAU2kIuw=",
      "salt": "ZAAcuZXGK8v1sQQVvLesfQ==",
      "roles": ["User"]
    }
  ]
}
*/
#endregion