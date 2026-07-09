// See https://aka.ms/new-console-template for more information
using System.Security.Cryptography;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using Backend.Core.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Core;

[RegisterService(ServiceLifetime.Transient)]
public class PasswordHasher
{
	public static readonly TimeSpan ExpiryDurationForRefreshTokens = TimeSpan.FromDays(7);
	private static readonly TimeSpan ExpiryDurationForAccessTokens = TimeSpan.FromMinutes(60);

	private const int SaltSize = 16; // 16 bytes = 128 bits
	private const int HashSize = 32; // 32 bytes = 256 bits
	private const int RefreshTokenSize = 32; // 32 bytes = 256 bits
	private const int Iterations = 100000; // Number of iterations
	private readonly JwtConfig _jwtConfig;

	public PasswordHasher(IOptions<JwtConfig> jwtConfigAccessor)
	{
		_jwtConfig = jwtConfigAccessor.Value;
	}

	public static (byte[] hashedPassword, byte[] salt) HashPassword(string password)
	{
		var salt = RandomNumberGenerator.GetBytes(SaltSize);
		var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, HashSize);

		return (hash, salt);
	}

	public bool VerifyPassword(string enteredPassword, byte[] storedHash, byte[] storedSalt)
	{
		var enteredHash = Rfc2898DeriveBytes.Pbkdf2(enteredPassword, storedSalt, Iterations, HashAlgorithmName.SHA256, HashSize);
		
		return enteredHash.SequenceEqual(storedHash);
	}

	public string GenerateAccessToken(IEnumerable<Claim> claims)
	{
		var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtConfig.JwtSecret));
		var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

		var secToken = new JwtSecurityToken(
			issuer: _jwtConfig.JwtIssuer,
			audience: _jwtConfig.JwtIssuer, //TODO: Should this be "AUDIENCE"?
			claims: claims,
			notBefore: null,
			expires: DateTime.Now.Add(ExpiryDurationForAccessTokens),
			signingCredentials: credentials);

		var accessToken = new JwtSecurityTokenHandler().WriteToken(secToken);
		return accessToken;
	}

	public string GenerateRefreshToken()
	{
		var refreshToken = new byte[RefreshTokenSize];
		using (var rng = RandomNumberGenerator.Create())
		{
			rng.GetBytes(refreshToken);
		}
		return Convert.ToBase64String(refreshToken);
	}
}


