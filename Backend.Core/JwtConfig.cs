using Microsoft.Extensions.Configuration;

namespace Backend.Core;


public class JwtConfig
{
    // public required string JwtBearer { get; set; }

    public required string JwtSecret { get; set; }

    public required string JwtIssuer { get; set; }

    // public required string Audience { get; set; }

    public static void Mapper(JwtConfig options, IConfigurationRoot config)
    {
        // options.JwtBearer = config["JWT_BEARER"] ?? throw new Exception("Missing JWT Configuration (JWT_BEARER)");
        options.JwtSecret = config["JWT_SECRET"] ?? throw new Exception("Missing JWT Configuration (JWT_SECRET)");
        options.JwtIssuer = config["JWT_ISSUER"] ?? throw new Exception("Missing JWT Configuration (ISSUER)");
        // options.Audience = config["AUDIENCE"] ?? throw new Exception("Missing JWT Configuration (AUDIENCE)");
    }
}

