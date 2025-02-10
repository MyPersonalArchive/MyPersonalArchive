// See https://aka.ms/new-console-template for more information
using System.Security.Cryptography;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Options;
using System.Security.Claims;

namespace Backend.Core;


public class PasswordHasher
{
    public static readonly TimeSpan ExpiryDurationForRefreshTokens = TimeSpan.FromDays(7);
    private static readonly TimeSpan ExpiryDurationForAccessTokens = TimeSpan.FromMinutes(60);

    private const int SaltSize = 16; // 16 bytes = 128 bits
    private const int HashSize = 32; // 32 bytes = 256 bits
    private const int RefreshTokenSize = 32; // 32 bytes = 256 bits
    private const int Iterations = 100000; // Number of iterations
    private readonly JwtConfig _jwtConfig;

    public PasswordHasher(IOptions<JwtConfig> jwtConfigAccessor) {
        _jwtConfig = jwtConfigAccessor.Value;
    }

    public static (byte[] hashedPassword, byte[] salt) HashPassword(string password)
    {
        byte[] salt = new byte[SaltSize];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(salt);
        }

        // Derive the key using PBKDF2
        using (var pbkdf2 = new Rfc2898DeriveBytes(password, salt, Iterations, HashAlgorithmName.SHA256))
        {
            byte[] hash = pbkdf2.GetBytes(HashSize);
            return (hash, salt);
        }
    }

    public bool VerifyPassword(string enteredPassword, byte[] storedHash, byte[] storedSalt)
    {
        // Derive the key from the entered password and stored salt
        using (var pbkdf2 = new Rfc2898DeriveBytes(enteredPassword, storedSalt, Iterations, HashAlgorithmName.SHA256))
        {
            byte[] enteredHash = pbkdf2.GetBytes(HashSize);
            return enteredHash.SequenceEqual(storedHash);
        }
    }

    public (string accessToken, string refreshToken) GenerateTokens(IEnumerable<Claim> claims)
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

        var refreshToken = new byte[RefreshTokenSize];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(refreshToken);
        }

        return (accessToken, refreshToken: Convert.ToBase64String(refreshToken));
    }
}

