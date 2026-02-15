using Backend.Core.Authentication;
using Backend.WebApi.Services;


namespace Backend.WebApi.CqrsInfrastructure;


public class ExternalAccount
{
	public Guid Id { get; set; }
	public required string DisplayName { get; set; }
	public required string EmailAddress { get; set; }
	public required IAuthContext Credentials { get; set; }
	public required string Type { get; set; }
	public required string Provider { get; set; }
}


[RequireAllowedTenantId]
public class SaveExternalAccounts : ICommand<SaveExternalAccounts>
{
	public required IEnumerable<ExternalAccount> ExternalAccounts { get; set; }
}

[RequireAllowedTenantId]
public class GetExternalAccounts : IQuery<GetExternalAccounts, IEnumerable<ExternalAccount>>
{
	// No parameters to get all stored filters
}


public class ExternalAccountHandler :
	IAsyncCommandHandler<SaveExternalAccounts>,
	IAsyncQueryHandler<GetExternalAccounts, IEnumerable<ExternalAccount>>
{
	private readonly ExternalAccountService _externalAccountsService;

	public ExternalAccountHandler(ExternalAccountService externalAccountsService)
	{
		_externalAccountsService = externalAccountsService;
	}

	public async Task Handle(SaveExternalAccounts command)
	{
		var externalAccounts = command.ExternalAccounts.Select(f => new ExternalAccountSettings.Account
		{
			Id = f.Id,
			DisplayName = f.DisplayName,
			EmailAddress = f.EmailAddress,
			Credentials = f.Credentials,
			Type = f.Type,
			Provider = f.Provider,
		}).ToList();

		await _externalAccountsService.StoreExternalAccountSettingsAsync(new ExternalAccountSettings
		{
			ExternalAccounts = externalAccounts
		});
	}

	public async Task<IEnumerable<ExternalAccount>> Handle(GetExternalAccounts query)
	{
		var externalAccountSettings = await _externalAccountsService.GetExternalAccountSettingsAsync();

		return externalAccountSettings!.ExternalAccounts.Select(f => new ExternalAccount
		{
			Id = f.Id,
			DisplayName = f.DisplayName,
			EmailAddress = f.EmailAddress,
			Credentials = f.Credentials,
			Type = f.Type,
			Provider = f.Provider
		});
	}
}