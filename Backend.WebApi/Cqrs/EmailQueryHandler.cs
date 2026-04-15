using Backend.Core.Authentication;
using Backend.EmailIngestion;
using Backend.EmailIngestion.Services;
using Backend.WebApi.Cqrs.Infrastructure;
using Backend.WebApi.Services;
using MailKit.Net.Imap;
using MailKit.Security;

namespace Backend.WebApi.Cqrs;


[RequireAllowedTenantId]
public class ListFolders : IQuery<ListFolders, IEnumerable<string>>
{
	public required Guid ExternalAccountId { get; set; }
}


[RequireAllowedTenantId]
public class GetEmailContents : IQuery<GetEmailContents, GetEmailContents.EmailContents>
{
	public required Guid ExternalAccountId { get; set; }
	public required string Folder { get; set; }
	public required uint MessageId { get; set; }

	public record EmailContents(string? Body, string? HtmlBody);
}
public class EmailQueryHandler :
	IAsyncQueryHandler<ListFolders, IEnumerable<string>>,
	IAsyncQueryHandler<GetEmailContents, GetEmailContents.EmailContents>
{
	private readonly ExternalAccountService _externalAccountService;
	private readonly EmailProviderService _emailProviderService;
	private readonly AccessTokenHelper _accessTokenHelper;

	public EmailQueryHandler(ExternalAccountService externalAccountService,
						  EmailProviderService emailProviderService,
						  AccessTokenHelper accessTokenHelper)
	{
		_externalAccountService = externalAccountService;
		_emailProviderService = emailProviderService;
		_accessTokenHelper = accessTokenHelper;
	}


	public async Task<IEnumerable<string>> Handle(ListFolders query)
	{
		var imapClient = await GetImapClient(query.ExternalAccountId);

		return await imapClient.GetAvailableFolders();
	}


	public async Task<GetEmailContents.EmailContents> Handle(GetEmailContents query)
	{
		var imapClient = await GetImapClient(query.ExternalAccountId);

		var emailContents = await imapClient.GetEmailContents(query.Folder, query.MessageId);
		if (emailContents == null)
		{
			throw new Exception($"Email with MessageId {query.MessageId} not found in folder {query.Folder}");
		}

		return new GetEmailContents.EmailContents(
			emailContents.PlainText,
			emailContents.Html
		);
	}


	private async Task<IImapClient> GetImapClient(Guid externalAccountId)
	{
		var externalAccountSettings = await _externalAccountService.GetExternalAccountSettingsAsync();
		var externalAccount = externalAccountSettings.GetExternalAccount(externalAccountId);

		var emailProviderSettings = await _emailProviderService.GetEmailProviderSettingsAsync();
		var authType = emailProviderSettings.GetAuthType(externalAccount.Provider, externalAccount.Credentials.Type);
		var emailProvider = emailProviderSettings.GetEmailProvider(externalAccount.Provider);

		var auth = externalAccount.Credentials;

		var refreshedAuth = await _accessTokenHelper.RefreshAccessTokenIfNeeded(auth, authType);
		if (refreshedAuth != auth)
		{
			externalAccount.Credentials = refreshedAuth;
			await _externalAccountService.Replace(externalAccount);
		}

		try
		{
			var imapClient = await ImapClientFactory.ConnectAsync(refreshedAuth, externalAccount.EmailAddress, emailProvider);
			return imapClient;
		}
		catch (AuthenticationException) when (refreshedAuth is OAuthContext)
		{
			// Token was rejected by the server despite our clock saying it's valid.
			// This can happen due to clock drift, revocation, or provider-side expiry.
			// Force a refresh and retry once.
			var forcedAuth = await _accessTokenHelper.ForceRefreshAccessToken(refreshedAuth, authType);
			externalAccount.Credentials = forcedAuth;
			await _externalAccountService.Replace(externalAccount);

			return await ImapClientFactory.ConnectAsync(forcedAuth, externalAccount.EmailAddress, emailProvider);
		}
	}

}