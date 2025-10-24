using MimeKit;

public record EmailAttachment(
    string FileName,
	string ContentType
);

public class Email
{
	public string UniqueId { get; set; } = string.Empty;
	public string Subject { get; set; } = string.Empty;
	public string Body { get; set; } = string.Empty;
	public string HtmlBody { get; set; } = string.Empty;
	public DateTimeOffset ReceivedTime { get; set; }
	public IEnumerable<Address> From { get; set; } = [];
	public IEnumerable<Address> To { get; set; } = [];
	public List<EmailAttachment> Attachments { get; set; } = [];

	public class Address
	{
		public required string EmailAddress { get; set; }
		public string? Name { get; set; }
	}
}

public class Attachment
{
	public required Stream Stream { get; set; }
	public required string ContentType { get; set; }
	public required string FileName { get; set; }
	public long FileSize { get; set; }
}

public record AuthContext
{
	public string? AccessToken { get; init; }      // For OAuth providers
	public string? RefreshToken { get; init; }
	public string? Username { get; init; }         // For plain IMAP
	public string? Password { get; init; }         // For plain IMAP
	public DateTime ExpiresAt { get; set; }

	public static AuthContext FromOAuth(string accessToken, string? refreshToken = null) =>
		new AuthContext { AccessToken = accessToken, RefreshToken = refreshToken };

	public static AuthContext FromBasic(string username, string password) =>
		new AuthContext { Username = username, Password = password };
}


public enum EmailAuthMode
{
	Oath2,
	Basic
}

public class EmailSearchCriteria
{
	public List<string>? Folders { get; set; }
	public string? Subject { get; set; }
	public string? From { get; set; }
	public string? To { get; set; }
	public int Limit { get; set; }
	public DateTime? Since { get; set; }
}

public interface IEmailProvider
{
	EmailAuthMode AuthenticationMode { get; }
	string Name { get; }

	string GetAuthorizationUrl(string state, string redirectUri);

	Task<AuthContext> ExchangeCodeForTokenAsync(string code, string redirectUri);

	Task<IList<string>> GetAvailableFolders(AuthContext auth);

	Task<IList<Email>> FindAttachmentsAsync(AuthContext auth, EmailSearchCriteria searchCriteria);

	Task<Attachment?> DownloadAttachmentAsync(AuthContext auth, string messageId, string fileName);
}