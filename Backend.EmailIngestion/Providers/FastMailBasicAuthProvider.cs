using System.Text.Json;
using MailKit;
using MailKit.Net.Imap;
using MailKit.Search;
using MailKit.Security;

namespace Backend.EmailIngestion.Providers;

public class FastMailBasicAuthProvider : ImapProviderBase
{
	private readonly string _imapHost = "imap.fastmail.com";
	private readonly int _imapPort = 993;

	public override string Name => "fastmail";

	public override EmailAuthMode AuthenticationMode => EmailAuthMode.Basic;


	public override string GetAuthorizationUrl(string state, string redirectUri)
	{
		throw new NotSupportedException("FastMail does not support OAuth flow. Use username/app-password.");
	}

	public override Task<IAuthContext> ExchangeCodeForTokenAsync(string code, string redirectUri)
	{
		throw new NotSupportedException("FastMail does not support token exchange.");
	}


	protected override async Task<IImapClient> ConnectAsync(IAuthContext auth)
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

		public override bool TryCreateAuthContext(string authJson, out IAuthContext? auth)
	{
		auth = JsonSerializer.Deserialize<BasicAuthContext>(authJson);
		return auth != null;
	}

}
