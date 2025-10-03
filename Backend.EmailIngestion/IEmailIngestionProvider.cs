public record TokenResult(string AccessToken, string RefreshToken, DateTime ExpiresAt);

public record EmailAttachment(
    string MessageId,
    string Subject,
    string From,
    DateTime Date,
    string FileName
);

public record AuthContext
{
    public string? AccessToken { get; init; }      // For OAuth providers
    public string? RefreshToken { get; init; }     // Optional
    public string? Username { get; init; }         // For FastMail / plain IMAP
    public string? Password { get; init; }         // For FastMail / plain IMAP

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

public interface IEmailIngestionProvider
{
    EmailIngestionAuthMode AuthenticationMode {get;}
    string Name { get; }

    // Step 1: Get OAuth login URL
    string GetAuthorizationUrl(string state, string redirectUri);

    // Step 2: Exchange code for tokens
    Task<TokenResult> ExchangeCodeForTokenAsync(string code, string redirectUri);

    // Step 3: Find attachments
    Task<IList<EmailAttachment>> FindAttachmentsAsync(AuthContext auth);

    // Step 4: Download attachment
    Task<Stream?> DownloadAttachmentAsync(AuthContext auth, string messageId, string fileName);
}