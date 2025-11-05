using System.Text.Json;
using MailKit;
using MailKit.Net.Imap;
using MailKit.Search;
using MailKit.Security;
using Microsoft.Extensions.Configuration;

namespace Backend.EmailIngestion.Providers;

public class GmailProvider : ImapProviderBase
{
	private readonly string _clientId;
	private readonly string _clientSecret;

	public override string Name => "gmail";

	public override EmailAuthMode AuthenticationMode => EmailAuthMode.Oath2;


	public GmailProvider(IConfiguration config)
	{
		_clientId = config["Google:ClientId"]!;
		_clientSecret = config["Google:ClientSecret"]!;
	}


	protected override async Task<IImapClient> ConnectAsync(IAuthContext auth)
	{
		if (auth is not OAuthContext oauth || oauth.AccessToken == null)
		{
			throw new ArgumentException("Invalid auth context for OAuth provider.");
		}
		var client = new ImapClient();
		var http = new HttpClient();
		var info = await http.GetStringAsync($"https://openidconnect.googleapis.com/v1/userinfo?access_token={Uri.EscapeDataString(oauth.AccessToken)}");
		var email = JsonDocument.Parse(info).RootElement.GetProperty("email").GetString();

		await client.ConnectAsync("imap.gmail.com", 993, SecureSocketOptions.SslOnConnect);
		await client.AuthenticateAsync(new SaslMechanismOAuth2(email, oauth.AccessToken));

		return client;
	}


	public override bool TryCreateAuthContext(string authJson, out IAuthContext? auth)
	{
		auth = JsonSerializer.Deserialize<OAuthContext>(authJson);
		return auth != null;
	}
}
