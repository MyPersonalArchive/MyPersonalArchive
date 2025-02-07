using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Backend.Core;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;
using Backend.DbModel.Database;
using ConsoleApp1;
using Backend.Core.Providers;

namespace Backend.WebApi;


public static class Program
{
    private static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Add services to the container.
        builder.Services.AddControllers();

        // builder.Services.Configure<AppConfig>(builder.Configuration.GetSection("AppConfig"));
        builder.Services.Configure<DbConfig>(builder.Configuration.GetSection("AppConfig"));
        builder.Services.Configure<AppConfig>(builder.Configuration.GetSection("AppConfig"));
        builder.Services.Configure<JwtConfig>(options => JwtConfig.Mapper(options, builder.Configuration));

        builder.Services.AddHttpContextAccessor();

        // builder.Services.AddDbContext<MpaDbContext>();

        builder.Services.AddScoped<MpaDbContext>();
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
        services.AddSwaggerGen(options => {});
    }


    private static void PrepareDatabase(this WebApplication app)
    {
        var services = app.Services;

        var dbConfigAccessor = services.GetRequiredService<IOptions<DbConfig>>();
        var dbContext = new MpaDbContext(dbConfigAccessor, new DummyAmbientDataResolver());
        dbContext.Database.Migrate();  // This will apply any pending migrations

        if (app.Environment.IsDevelopment())
        {
            // Seed the development database with some initial data
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


    internal class DummyAmbientDataResolver : AmbientDataResolver
    {
        public override int GetCurrentTenantId()
        {
            return 0;
        }
    }
}
