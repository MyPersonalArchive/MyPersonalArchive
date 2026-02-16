using System.Text.Json;
using Backend.Core.Authentication;
using MailKit;
using MailKit.Net.Imap;
using MailKit.Search;
using MailKit.Security;

namespace Backend.EmailIngestion.Providers;

public class FastMailBasicAuthProvider : AuthProviderBase
{
	private readonly string _imapHost = "imap.fastmail.com";
	private readonly int _imapPort = 993;

	public override string Name => "fastmail";

	public override AuthMode AuthenticationMode => AuthMode.Basic;


	public override async Task<IImapClient> ConnectAsync(IAuthContext auth, string email)
	{
		if (auth is not BasicAuthContext basicAuth)
		{
			throw new ArgumentException("Invalid auth context for Basic Auth provider.");
		}
		
		var client = new ImapClient();
		await client.ConnectAsync(_imapHost, _imapPort, SecureSocketOptions.SslOnConnect);
		await client.AuthenticateAsync(basicAuth.Username, basicAuth.Password);
		return client;
	}


	public override Task<IAuthContext> RefreshAccessTokenIfNeeded(IAuthContext auth)
	{
		// Basic auth doesn't have access tokens, so we just return the input auth context as is.
		return Task.FromResult(auth);
	}

}
