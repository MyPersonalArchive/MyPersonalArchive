using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Backend.Core;
using Backend.Backup;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;
using Backend.DbModel.Database;
using Backend.Core.Providers;
using Newtonsoft.Json;
using System.Net;
using Microsoft.AspNetCore.Authorization;
using System.Reflection;
using Backend.WebApi.Managers.Backup;
using Backend.WebApi.Middleware;
using Backend.Core.JsonConverters;
using Backend.WebApi.Cqrs.Infrastructure;
using MailKit.Net.Imap;
using Backend.Core.Infrastructure;
using Backend.WebApi.SignalR;
using Backend.Backup.Services;

namespace Backend.WebApi;


public static class Program
{
	private static ILogger _logger = null!;

	private static void Main(string[] args)
	{
		var builder = WebApplication.CreateBuilder(args);
		InitializeLogger(builder);

		// OBS: For JSON serialization. Converter is for telling newtonsoft how to properly deserialize JsonObjects.
		// JsonObject is used in our dbContext. Can we instead use JObject? We are not using Newtonsoft there.
		JsonConvert.DefaultSettings = () => new JsonSerializerSettings
		{
			Converters = { new JsonObjectConverter() },
			ReferenceLoopHandling = ReferenceLoopHandling.Ignore
		};

		var executingAssembly = Assembly.GetExecutingAssembly();
		var otherRelevantAssemblies = executingAssembly.GetReferencedAssemblies().Where(x => x.Name!.StartsWith("Backend")).Select(Assembly.Load);	//TODO: Include only specific assemblies? All referenced assemblies could be a lot.

		// Add services to the container.
		new HandlerDiscovery(builder.Services, _logger)
			.RegisterCommandAndQueryHandlers([executingAssembly, ..otherRelevantAssemblies]);

		new ServiceDiscovery(builder.Services, _logger)
			.RegisterServices([executingAssembly, ..otherRelevantAssemblies]);

		builder.Services.AddControllers();

		builder.Services.Configure<DbConfig>(builder.Configuration.GetSection("AppConfig"));
		builder.Services.Configure<AppConfig>(builder.Configuration.GetSection("AppConfig"));
		builder.Services.Configure<JwtConfig>(options => JwtConfig.Mapper(options, builder.Configuration));

		builder.Services.AddHttpContextAccessor();
		builder.Services.AddSingleton<IAuthorizationHandler, TenantIdRequirementsAuthorizationHandler>();

		builder.Services.AddDbContext<MpaDbContext>();

		builder.Services.AddScoped<IAmbientDataResolver, WebApiAmbientDataResolver>();
		builder.Services.AddTransient<PasswordHasher>();
		builder.Services.AddScoped<IFileStorageProvider, FileStorageProvider>();

		builder.Services.AddHttpClient();
		builder.Services.AddOptions();

		builder.Services.AddScoped<ImapClient>();

		builder.RegisterEndpoints();
		builder.RegisterSignalRServices();
		builder.RegisterAuthenticationServices();
		builder.RegisterBackupProviders();


		// builder.Services.AddScoped<IVersionRepository, VersionRepository>();
		// builder.Services.AddScoped<ISeedService, SeedService>();

		var app = builder.Build();

		app.PrepareDatabase();
		app.Configure();

		app.Run();
	}

	private static void InitializeLogger(this WebApplicationBuilder builder)
	{
		using var serviceProvider = builder.Services.BuildServiceProvider();
		_logger = serviceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Backend.WebApi.Program");
	}

	private static void RegisterEndpoints(this WebApplicationBuilder builder)
	{
		builder.WebHost.UseKestrel(options =>
		{
			var cert_file = "/data/https/server.pfx";
			var cert_password = builder.Configuration.GetValue<string>("CertificatePassword")?.TrimEnd('\n', '\r');
			
			// Read port from environment variable or default to 5054
			var portString = Environment.GetEnvironmentVariable("BACKEND_PORT") ?? "5054";
			var port = int.TryParse(portString, out var parsedPort) ? parsedPort : 5054;
			
			// Use IPAddress.Any (0.0.0.0) to allow access from outside the container
			var bindAddress = IPAddress.Any;
			
			if (!string.IsNullOrEmpty(cert_password) && File.Exists(cert_file))
			{
				options.Listen(bindAddress, port, listenOptions => { listenOptions.UseHttps(cert_file, cert_password); });
			}
			else
			{
				_logger.LogWarning("HTTPS certificate not found at {CertFile} or password missing. Starting Kestrel without HTTPS on port {Port}.", cert_file, port);
				options.Listen(bindAddress, port);
			}
		});
	}


	private static void RegisterSignalRServices(this IHostApplicationBuilder builder)
	{
		var services = builder.Services;

		services.AddSignalR(new Action<HubOptions>(hubOptions =>
		{
			hubOptions.EnableDetailedErrors = true;
			hubOptions.KeepAliveInterval = TimeSpan.FromSeconds(15);
		}));
	}


	private static void RegisterBackupProviders(this IHostApplicationBuilder builder)
	{
		var services = builder.Services;
		var appConfig = builder.Configuration.GetSection("AppConfig").Get<AppConfig>();
		// Use the new backup services extension method
		services.AddBackupServices(options =>
		{
			options.BackupFolder = appConfig?.BackupFolder ?? "./backups";
			options.DefaultInterval = TimeSpan.FromMinutes(30);
			options.MaxConcurrentBackups = 3;
			options.EnableProgressReporting = true;
		});

		// Register factories with signaling server URL, ICE servers, and connection pool
		services.AddSingleton<BackupProviderFactory>(sp => 
		{
			var connectionPool = sp.GetRequiredService<WebRTCConnectionPool>();
			return new BackupProviderFactory(appConfig?.SignalingServerUrl, appConfig?.IceServers, connectionPool);
		});
		services.AddSingleton<Func<IServiceScope, int, IBackupProgressReporter>>((sp) => 
			(scope, tenantId) => new SignalRBackupProgressReporter(scope, tenantId));
		
		// Register restore manager with progress reporter factory
		services.AddSingleton<TenantRestoreManager>(sp =>
		{
			var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();
			var progressReporterFactory = sp.GetService<Func<IServiceScope, int, IBackupProgressReporter>>();
			return new TenantRestoreManager(scopeFactory, progressReporterFactory);
		});
	}


	private static void RegisterAuthenticationServices(this WebApplicationBuilder builder)
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
					ValidAudience = jwtOptions.Audience,
					IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.JwtSecret))
				};

				options.Audience = jwtOptions.Audience;
				// options.Authority = jwtOptions.???;

			})
			.AddCookie("Cookies", options =>
			{
				options.LoginPath = "/api/authentication/signin";
				options.LogoutPath = "/api/authentication/signout";
				options.AccessDeniedPath = "/api/authentication/access-denied-redirect";
				options.ExpireTimeSpan = TimeSpan.FromMinutes(30);
				options.SlidingExpiration = true;
				options.Cookie.HttpOnly = true;
				options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
				options.Cookie.SameSite = SameSiteMode.Lax; // Allow cross-site requests
				options.Cookie.Name = "MyPersonalArchive.Auth";
				options.Cookie.Path = "/"; // Ensure cookie is sent to all paths
				options.Events.OnRedirectToLogin = context =>
				{
					// For API requests, return 401 instead of redirecting
					if (context.Request.Path.StartsWithSegments("/api"))
					{
						context.Response.StatusCode = 401;
						return Task.CompletedTask;
					}
					context.Response.Redirect(context.RedirectUri);
					return Task.CompletedTask;
				};
				options.Events.OnRedirectToAccessDenied = context =>
				{
					// For API requests, return 403 instead of redirecting
					if (context.Request.Path.StartsWithSegments("/api"))
					{
						context.Response.StatusCode = 403;
						return Task.CompletedTask;
					}
					context.Response.Redirect(context.RedirectUri);
					return Task.CompletedTask;
				};
			});

		builder.Services.AddAuthorization(options =>
		{
			options.AddPolicy("TenantIdPolicy", policy =>
			{
				policy.AddAuthenticationSchemes(JwtBearerDefaults.AuthenticationScheme, "Cookies");
				policy.RequireAuthenticatedUser(); // Ensure user is authenticated first
				policy.Requirements.Add(new TenantIdRequirement());
			});

			// Default policy that accepts both JWT and Cookie authentication
			options.DefaultPolicy = new AuthorizationPolicyBuilder()
				.AddAuthenticationSchemes(JwtBearerDefaults.AuthenticationScheme, "Cookies")
				.RequireAuthenticatedUser()
				.Build();
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
			DemoDataGenerator.Seed(dbConfig);
		}
	}


	private static void Configure(this WebApplication app)
	{
		if (app.Environment.IsDevelopment())
		{
			app.UseDeveloperExceptionPage();
		}

		app.UseHttpsRedirection();

		app.UseMiddleware<TenantHeaderFromQueryStringMiddleware>((object)new string[] {
			"/api/RemoteAuthentication/start-authentication",
			"/api/email/download-attachment"
		});
		app.UseMiddleware<TenantHeaderFromStateJsonMiddleware>((object)new string[] {
			"/api/RemoteAuthentication/callback"
		});

		app.UseAuthentication();
		app.UseAuthorization();

		app.UseWebSockets();
		app.MapHub<NotificationHub>("/notificationHub");

		app.UseStaticFiles();

		app.MapFallbackToFile("index.html");

		app.MapControllers();
	}
}