using MimeKit;
using System.Text.Json.Serialization;

namespace Backend.EmailIngestion;


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

	public class EmailAttachment
	{
		public required string FileName { get; set; }
		public required string ContentType { get; set; }
	}
}

public class Attachment
{
	public required Stream Stream { get; set; }
	public required string ContentType { get; set; }
	public required string FileName { get; set; }
	public long FileSize { get; set; }
}


[JsonDerivedType(typeof(OAuthContext), typeDiscriminator: "oauth")]
[JsonDerivedType(typeof(BasicAuthContext), typeDiscriminator: "basic")]
public interface IAuthContext
{
	//TODO: make this an interface?
}

public class OAuthContext : IAuthContext
{
	public string? AccessToken { get; init; }
	public string? RefreshToken { get; init; }
	public DateTime ExpiresAt { get; set; }
}

public class BasicAuthContext : IAuthContext
{
	public required string Username { get; init; }
	public required string Password { get; init; }
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
