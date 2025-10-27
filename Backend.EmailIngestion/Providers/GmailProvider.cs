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

	public override string GetAuthorizationUrl(string state, string redirectUri)
	{
		var scopes = Uri.EscapeDataString(
			"https://mail.google.com/ https://www.googleapis.com/auth/userinfo.email"
		);
		return
			$"https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id={_clientId}&redirect_uri={Uri.EscapeDataString(redirectUri)}&scope={scopes}&access_type=offline&prompt=consent&state={state}";
	}

	public override async Task<AuthContext> ExchangeCodeForTokenAsync(string code, string redirectUri)
	{
		using var client = new HttpClient();
		var resp = await client.PostAsync("https://oauth2.googleapis.com/token",
			new FormUrlEncodedContent(new Dictionary<string, string>
			{
				["code"] = code,
				["client_id"] = _clientId,
				["client_secret"] = _clientSecret,
				["redirect_uri"] = redirectUri,
				["grant_type"] = "authorization_code"
			})
		);

		resp.EnsureSuccessStatusCode();
		var json = JsonDocument.Parse(await resp.Content.ReadAsStringAsync()).RootElement;

		return new AuthContext
		{
			AccessToken = json.GetProperty("access_token").GetString()!,
			RefreshToken = json.GetProperty("refresh_token").GetString(),
			ExpiresAt = DateTime.UtcNow.AddSeconds(json.GetProperty("expires_in").GetInt32())
		};
	}


	protected override async Task<IImapClient> ConnectAsync(AuthContext auth)
	{
		var client = new ImapClient();
		var http = new HttpClient();
		var info = await http.GetStringAsync($"https://openidconnect.googleapis.com/v1/userinfo?access_token={Uri.EscapeDataString(auth.AccessToken)}");
		var email = JsonDocument.Parse(info).RootElement.GetProperty("email").GetString();

		await client.ConnectAsync("imap.gmail.com", 993, SecureSocketOptions.SslOnConnect);
		await client.AuthenticateAsync(new SaslMechanismOAuth2(email, auth.AccessToken));

		return client;
	}
}
