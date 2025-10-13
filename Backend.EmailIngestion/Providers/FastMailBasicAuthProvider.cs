using MailKit;
using MailKit.Net.Imap;
using MailKit.Search;
using MailKit.Security;

public class FastMailBasicAuthProvider : ImapProviderBase, IEmailIngestionProvider
{
	private readonly string _imapHost = "imap.fastmail.com";
	private readonly int _imapPort = 993;

	public string Name => "fastmail";

	public EmailIngestionAuthMode AuthenticationMode => EmailIngestionAuthMode.Basic;

	public string GetAuthorizationUrl(string state, string redirectUri)
	{
		throw new NotSupportedException("FastMail does not support OAuth flow. Use username/app-password.");
	}

	public Task<AuthContext> ExchangeCodeForTokenAsync(string code, string redirectUri)
	{
		throw new NotSupportedException("FastMail does not support token exchange.");
	}

	public async Task<IList<Email>> FindAttachmentsAsync(AuthContext auth, EmailSearchCriteria searchCriteria)
	{
		using var client = await ConnectAsync(auth);
		return await FindAsync(client, searchCriteria);
	}

	public async Task<Attachment?> DownloadAttachmentAsync(AuthContext auth, string messageId, string fileName)
	{
		using var client = await ConnectAsync(auth);
		return await DownloadAttachmentAsync(client, messageId, fileName);
	}

	public async Task<IList<string>> GetAvailableFolders(AuthContext auth)
	{
		using var client = await ConnectAsync(auth);
		return await GetAvailableFolders(client);
	}
	
	private async Task<ImapClient> ConnectAsync(AuthContext auth)
	{
		var client = new ImapClient();
		await client.ConnectAsync(_imapHost, _imapPort, SecureSocketOptions.SslOnConnect);
		await client.AuthenticateAsync(auth.Username, auth.Password);
		return client;
	}
}
