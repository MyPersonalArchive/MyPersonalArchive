using System.Text.Json;
using Backend.Core;
using Backend.Core.Authentication;
using Backend.EmailIngestion;
using Microsoft.Extensions.Options;


namespace Backend.WebApi.Services;


[RegisterService(ServiceLifetime.Scoped)]
public class ExternalAccountService : UserSettingsServiceBase<ExternalAccountSettings>
{
	protected override string FileName => "ExternalAccountSettings.json";

	private readonly SignalRService _signalRService;

	public ExternalAccountService(IOptions<AppConfig> config, IAmbientDataResolver resolver, SignalRService signalRService)
		: base(config, resolver)
	{
		_signalRService = signalRService;
	}


	public async Task<ExternalAccountSettings> GetExternalAccountSettingsAsync()
	{
		return await LoadSettingsAsync();
	}

	public async Task StoreExternalAccountSettingsAsync(ExternalAccountSettings settings)
	{
		await SaveSettingsAsync(settings);
		await _signalRService.PublishToTenantChannel(new SignalRService.Message("ExternalAccountsUpdated", null));
	}

	// public async Task ChangeExternalAccountSettingsAsync(Func<ExternalAccountSettings, ExternalAccountSettings> changeDelegate)
	// {
	// 	await ChangeSettingsAsync(changeDelegate);
	// 	await _signalRService.PublishToTenantChannel(new SignalRService.Message("ExternalAccountsUpdated", null));
	// }

	public async Task Replace(ExternalAccountSettings.Account account)
	{
		await ChangeSettingsAsync(settings =>
		{
			var index = settings.ExternalAccounts.FindIndex(a => a.Id == account.Id);
			if (index != -1)
			{
				settings.ExternalAccounts[index] = account;
			}
			else
			{
				settings.ExternalAccounts.Add(account);
			}
			return settings;
		});
		await _signalRService.PublishToTenantChannel(new SignalRService.Message("ExternalAccountsUpdated", null));
	}

	public async Task AddOrReplace(ExternalAccountSettings.Account account)
	{
		await ChangeSettingsAsync(settings =>
		{
			// If an account with the same email and provider exists, replace it. Otherwise, add the new account.
			var index = settings.ExternalAccounts.FindIndex(a => a.EmailAddress == account.EmailAddress && a.Provider == account.Provider);
			if (index != -1)
			{
				settings.ExternalAccounts[index] = account;
			}
			else
			{
				settings.ExternalAccounts.Add(account);
			}
			return settings;
		});
		await _signalRService.PublishToTenantChannel(new SignalRService.Message("ExternalAccountsUpdated", null));
	}
}


public class ExternalAccountSettings : SettingsBase
{
	public List<Account> ExternalAccounts { get; set; } = [];

	public class Account
	{
		public Guid Id { get; set; }
		public required string DisplayName { get; set; }
		public required string EmailAddress { get; set; }
		public required IAuthContext Credentials { get; set; }
		public required string Type { get; set; }
		public required string Provider { get; set; }
	}
}
