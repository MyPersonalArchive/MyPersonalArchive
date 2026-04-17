using Backend.Core.Authentication;
using Backend.Core.Infrastructure;
using Backend.EmailIngestion.Services;
using MailKit.Net.Imap;
using MailKit.Security;

namespace Backend.EmailIngestion;

[RegisterService]
public class ImapClientFactory
{
	private readonly ExternalAccountService _externalAccountService;
	private readonly EmailProviderService _emailProviderService;
	private readonly AccessTokenHelper _accessTokenHelper;

	public ImapClientFactory(ExternalAccountService externalAccountService,
		EmailProviderService emailProviderService,
		AccessTokenHelper accessTokenHelper)
	{
		_externalAccountService = externalAccountService;
		_emailProviderService = emailProviderService;
		_accessTokenHelper = accessTokenHelper;
	}

	public async Task<IImapClient> GetImapClient(Guid externalAccountId)
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


	private static async Task<IImapClient> ConnectAsync(IAuthContext auth, string emailAddress, EmailProviderSettings.EmailProvider emailProvider)
	{
		var imapClient = new ImapClient();
		await imapClient.ConnectAsync(emailProvider.ImapHost, emailProvider.ImapPort, SecureSocketOptions.SslOnConnect);

		switch (auth)
		{
			case OAuthContext oauth:
				await imapClient.AuthenticateAsync(new SaslMechanismOAuth2(emailAddress, oauth.AccessToken));
				break;

			case BasicAuthContext basicAuth:
				await imapClient.AuthenticateAsync(basicAuth.Username, basicAuth.Password);
				break;

			default:
				throw new ArgumentException("Unsupported auth context type.");
		}

		return imapClient;
	}
}