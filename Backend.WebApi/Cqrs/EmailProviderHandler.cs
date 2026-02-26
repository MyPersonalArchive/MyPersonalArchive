using Backend.WebApi.Cqrs.Infrastructure;
using Backend.WebApi.Services;


namespace Backend.WebApi.Cqrs;


public class EmailProvider
{
	public required string Provider { get; set; }
	public required string DisplayName { get; set; }
	public required IEnumerable<AuthType> AuthTypes { get; set; } = [];
}

public class AuthType
{
	public required string Type { get; set; }
}


[RequireAuthentication]
public class GetEmailProviders : IQuery<GetEmailProviders, IEnumerable<EmailProvider>>
{
	// No parameters to get all stored filters
}


public class EmailProviderHandler :
	IAsyncQueryHandler<GetEmailProviders, IEnumerable<EmailProvider>>
{
	private readonly EmailProviderService _emailProviderService;

	public EmailProviderHandler(EmailProviderService emailProviderService)
	{
		_emailProviderService = emailProviderService;
	}


	public async Task<IEnumerable<EmailProvider>> Handle(GetEmailProviders query)
	{
		var emailProviders = await _emailProviderService.GetEmailProviderSettingsAsync();

		return emailProviders.EmailProviders.Select(f => new EmailProvider
		{
			Provider = f.Provider,
			DisplayName = f.DisplayName,
			AuthTypes = f.AuthTypes.Select(at => new AuthType
			{
				Type = at.Type
			})
		});
	}
}

