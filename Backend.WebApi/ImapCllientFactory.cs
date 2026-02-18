using Backend.Core.Authentication;
using Backend.Core.Infrastructure;
using Backend.WebApi.Services;
using MailKit.Net.Imap;
using MailKit.Security;

namespace Backend.EmailIngestion;

[RegisterService]
public class ImapClientFactory
{
	public static async Task<IImapClient> ConnectAsync(IAuthContext auth, string emailAddress, EmailProviderSettings.EmailProvider emailProvider)
	{
		var imapClient = new ImapClient();
		await imapClient.ConnectAsync(emailProvider.ImapHost, emailProvider.ImapPort, SecureSocketOptions.SslOnConnect);

		switch(auth)
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