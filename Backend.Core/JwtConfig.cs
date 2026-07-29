using Microsoft.Extensions.Configuration;

namespace Backend.Core;


public class JwtConfig
{
    public string? JwtSecret { get; set; }

    public string? JwtIssuer { get; set; }

    public string? Audience { get; set; }
}

