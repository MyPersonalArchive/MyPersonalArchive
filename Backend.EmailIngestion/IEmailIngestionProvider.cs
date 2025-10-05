public record EmailAttachment(
    string MessageId,
    string Subject,
    string From,
    DateTime Date,
    string FileName
);

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


public enum EmailIngestionAuthMode
{
	Oath2,
	Basic
}

public class EmailSearchCriteria
{
	public string? Subject { get; set; }
	public string? From { get; set; }
	public string? To { get; set; }
	public int Limit { get; set; }
	public DateTime? Since { get; set; }
}

public interface IEmailIngestionProvider
{
	EmailIngestionAuthMode AuthenticationMode { get; }
	string Name { get; }

	string GetAuthorizationUrl(string state, string redirectUri);

	Task<AuthContext> ExchangeCodeForTokenAsync(string code, string redirectUri);

	Task<IList<EmailAttachment>> FindAttachmentsAsync(AuthContext auth, EmailSearchCriteria searchCriteria);

	Task<Attachment?> DownloadAttachmentAsync(AuthContext auth, string messageId, string fileName);
}