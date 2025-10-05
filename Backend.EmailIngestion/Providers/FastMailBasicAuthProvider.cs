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

    public async Task<IList<EmailAttachment>> FindAttachmentsAsync(AuthContext auth, EmailSearchCriteria searchCriteria)
    {
        using var client = new ImapClient();
        await client.ConnectAsync(_imapHost, _imapPort, SecureSocketOptions.SslOnConnect);
        await client.AuthenticateAsync(auth.Username, auth.Password);

        return await FindAttachmentsAsync(client, searchCriteria);
    }

    public async Task<Attachment?> DownloadAttachmentAsync(AuthContext auth, string messageId, string fileName)
    {
        using var client = new ImapClient();
        await client.ConnectAsync(_imapHost, _imapPort, SecureSocketOptions.SslOnConnect);
        await client.AuthenticateAsync(auth.Username, auth.Password);

        return await DownloadAttachmentAsync(client, messageId, fileName);
    }
}
