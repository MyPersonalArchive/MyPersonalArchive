using System.Text.Json.Serialization;

namespace Backend.Core.Authentication;

[JsonDerivedType(typeof(OAuthContext), typeDiscriminator: "oauth")]
[JsonDerivedType(typeof(BasicAuthContext), typeDiscriminator: "basic")]
public interface IAuthContext
{
	string Type { get; }
}

public class OAuthContext : IAuthContext
{
	public string Type => "oauth";
	public string? AccessToken { get; set; }
	public string? RefreshToken { get; set; }
	public DateTime ExpiresAt { get; set; }
}

public class BasicAuthContext : IAuthContext
{
	public string Type => "basic";
	public required string Username { get; init; }
	public required string Password { get; init; }
}
