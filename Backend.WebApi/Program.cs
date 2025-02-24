using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Backend.Core;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;
using Backend.DbModel.Database;
using Backend.Core.Providers;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;
using Backend.DbModel.Database.EntityModels;

namespace Backend.WebApi;


public static class Program
{
    private static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Add services to the container.
        builder.Services.AddControllers();

        builder.Services.Configure<DbConfig>(builder.Configuration.GetSection("AppConfig"));
        builder.Services.Configure<AppConfig>(builder.Configuration.GetSection("AppConfig"));
        builder.Services.Configure<JwtConfig>(options => JwtConfig.Mapper(options, builder.Configuration));

        builder.Services.AddHttpContextAccessor();

        builder.Services.AddDbContext<MpaDbContext>();

        builder.Services.AddScoped<AmbientDataResolver, WebApiAmbientDataResolver>();
        builder.Services.AddTransient<PasswordHasher>();

        builder.Services.AddOptions();

        builder.RegisterSignalRServices();
        builder.RegisterJwtServices();
        builder.RegisterSwaggerServices();

        builder.Services.AddScoped<IFileStorageProvider, FileStorageProvider>();
        // builder.Services.AddScoped<IVersionRepository, VersionRepository>();
        // builder.Services.AddScoped<ISeedService, SeedService>();

        var app = builder.Build();

        app.PrepareDatabase();
        app.Configure();

        app.Run();
    }


    private static void RegisterSignalRServices(this IHostApplicationBuilder builder)
    {
        var services = builder.Services;

        services.AddSignalR(new Action<HubOptions>(hubOptions =>
        {
            hubOptions.EnableDetailedErrors = true;
            hubOptions.KeepAliveInterval = TimeSpan.FromSeconds(15);
        }));
        // services.AddScoped<ISignalRService, SignalRService>();
    }



    private static void RegisterJwtServices(this WebApplicationBuilder builder)
    {
        // Build a temporary serviceprovider to get the JWT configuration 
        var jwtOptions = WebApplication
            .CreateBuilder()
            .Services.Configure<JwtConfig>(options => JwtConfig.Mapper(options, builder.Configuration))
            .BuildServiceProvider()
            .GetRequiredService<IOptions<JwtConfig>>()
            .Value;

        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = jwtOptions.JwtIssuer,
                    ValidAudience = jwtOptions.JwtIssuer,   //TODO: Is this correct?
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.JwtSecret))
                };
            });
    }

    private static void RegisterSwaggerServices(this IHostApplicationBuilder builder)
    {
        var services = builder.Services;

        // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            // options.SwaggerDoc("v1", new OpenApiInfo { Title = "My API", Version = "v1" });

            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Name = "Authorization",
                Type = SecuritySchemeType.Http,
                Scheme = "Bearer",
                BearerFormat = "JWT",
                In = ParameterLocation.Header,
                Description = "Enter 'Bearer {your JWT token}' in the Authorization header."
            });

            options.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Name = "Authorization",
                        Type = SecuritySchemeType.Http,
                        Scheme = "Bearer",
                        BearerFormat = "JWT",
                        In = ParameterLocation.Header,
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id = "Bearer"
                        }
                    },
                    Array.Empty<string>()
                }
            });

            options.OperationFilter<SwaggerTenantIdHeaderFilter>();
        });
    }


    private static void PrepareDatabase(this WebApplication app)
    {
        var services = app.Services;

        var dbConfig = services.GetRequiredService<IOptions<DbConfig>>().Value;
        var tenantId = -1;
        var dbContext = new MpaDbContext(dbConfig, tenantId);  //tenantId -1 for default tenant when running db migrations scripts and seeding database
        dbContext.Database.Migrate();

        if (app.Environment.IsDevelopment())
        {
            // Seed the development database with some initial data

            var timezoneOffset = TimeSpan.FromHours(-2);
            var username = "admin@localhost";
            // var user = dbContext.Users.First(u => u.Username == username);
            var archiveItemsToEnsure = new List<ArchiveItem>{
                    new ArchiveItem {
                        Id = 1,
                        Title = "First demo item",
                        Tags = Tags.Ensure(dbContext, "Disco", "Pop", "Metal", "Rock"),
                        Blobs = [],
                        CreatedByUsername = username,
                        // CreatedBy = user,
                        CreatedAt = new DateTimeOffset(2025, 2, 5, 12, 0, 0, timezoneOffset)
                    },
                    new ArchiveItem {
                        Id = 2,
                        Title = "Second demo item",
                        Tags = Tags.Ensure(dbContext, "Techno", "Rave"),
                        Blobs = [],
                        CreatedByUsername = username,
                        // CreatedBy = user,
                        CreatedAt = new DateTimeOffset(2025, 2, 5, 12, 15, 0, timezoneOffset)
                    },
                    new ArchiveItem {
                        Id = 3,
                        Title = "Third demo item",
                        Tags = Tags.Ensure(dbContext, "House", "EDM", "Hiphop"),
                        Blobs = [],
                        CreatedByUsername = username,
                        // CreatedBy = user,
                        CreatedAt = new DateTimeOffset(2025, 2, 9, 15, 20, 0, timezoneOffset)
                    }
            };
            foreach (var item in archiveItemsToEnsure)
            {
                if (dbContext.ArchiveItems.All(ai => ai.Id != item.Id))
                {
                    dbContext.ArchiveItems.Add(item);
                }
            }

            dbContext.SaveChanges();
        }
    }

    private static void Configure(this WebApplication app)
    {
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseHttpsRedirection();

        app.UseAuthentication();
        app.UseAuthorization();

        app.UseWebSockets();
        // app.MapHub<NotificationHub>("/notificationHub");

        // app.MapGet("/testUserChannel", async (IHubContext<NotificationHub> hub, string message) =>
        //     await hub.Clients.All.SendAsync("userChannel", $"Message: {message}"));

        app.UseStaticFiles();

        app.MapFallbackToFile("index.html");

        app.MapControllers();
    }


    public class SwaggerTenantIdHeaderFilter : IOperationFilter
    {
        public void Apply(OpenApiOperation operation, OperationFilterContext context)
        {
            if (operation.Parameters == null)
                operation.Parameters = new List<OpenApiParameter>();

            operation.Parameters.Add(new OpenApiParameter
            {
                Name = "X-Tenant-Id",
                In = ParameterLocation.Header,
                Required = false,  // Change to 'false' if not required
                Schema = new OpenApiSchema
                {
                    Type = "string",
                    Default = new Microsoft.OpenApi.Any.OpenApiString("")
                }
            });
        }
    }
}
