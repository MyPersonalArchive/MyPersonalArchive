using MailKit;
using MailKit.Net.Imap;
using MailKit.Search;
using MailKit.Security;

public class FastMailProvider : IEmailIngestionProvider
{
    private readonly string _imapHost = "imap.fastmail.com";
    private readonly int _imapPort = 993;

    public string Name => "fastmail";

    public EmailIngestionAuthMode AuthenticationMode => EmailIngestionAuthMode.Basic;

    public string GetAuthorizationUrl(string state, string redirectUri)
    {
        // FastMail doesn’t use OAuth in the same way as Google.
        // You could return null or a message here.
        throw new NotSupportedException("FastMail does not support OAuth flow. Use username/app-password.");
    }

    public Task<TokenResult> ExchangeCodeForTokenAsync(string code, string redirectUri)
    {
        throw new NotSupportedException("FastMail does not support token exchange.");
    }

    public async Task<IList<EmailAttachment>> FindAttachmentsAsync(AuthContext auth)
    {
        // For FastMail, accessToken could just be "username:password" (or app password)
        // You might structure this differently, e.g. pass credentials explicitly.
        var username = auth.Username;
        var password = auth.Password;

        var results = new List<EmailAttachment>();

        using var client = new ImapClient();
        await client.ConnectAsync(_imapHost, _imapPort, SecureSocketOptions.SslOnConnect);
        await client.AuthenticateAsync(username, password);

        var inbox = client.Inbox;
        await inbox.OpenAsync(MailKit.FolderAccess.ReadOnly);

        var uids = await inbox.SearchAsync(SearchQuery.All);
        var items = await inbox.FetchAsync(uids.Reverse().Take(200).ToList(), MessageSummaryItems.Full | MessageSummaryItems.UniqueId);

        foreach (var item in items)
        {
            var message = await inbox.GetMessageAsync(item.UniqueId);
            foreach (var part in message.BodyParts.OfType<MimeKit.MimePart>())
            {
                if (part.IsAttachment)
                {
                    results.Add(new EmailAttachment(
                        item.UniqueId.Id.ToString(),
                        message.Subject,
                        message.From.ToString(),
                        message.Date.UtcDateTime,
                        part.FileName ?? "attachment"
                    ));
                }
            }
        }

        await client.DisconnectAsync(true);
        return results;
    }

    public async Task<Stream?> DownloadAttachmentAsync(AuthContext auth, string messageId, string fileName)
    {
        
        var username = auth.Username;
        var password = auth.Password;

        using var client = new ImapClient();
        await client.ConnectAsync(_imapHost, _imapPort, SecureSocketOptions.SslOnConnect);
        await client.AuthenticateAsync(username, password);

        var inbox = client.Inbox;
        await inbox.OpenAsync(MailKit.FolderAccess.ReadOnly);

        var message = await inbox.GetMessageAsync(new UniqueId(uint.Parse(messageId)));

        foreach (var part in message.BodyParts.OfType<MimeKit.MimePart>())
        {
            if (part.IsAttachment && part.FileName == fileName)
            {
                var ms = new MemoryStream();
                await part.Content.DecodeToAsync(ms);
                ms.Position = 0;
                return ms;
            }
        }

        return null;
    }
}
