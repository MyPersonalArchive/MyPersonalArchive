using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Backend.Core;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Authorization;
using System.Reflection;
using MailKit.Net.Imap;
using Backend.Core.Infrastructure;
using Backend.WebApi.SignalR;
using Backend.WebApi.Cqrs.Infrastructure;
using Backend.Mpa.DbModel.Database;
using System.Text.Json.Serialization;
using System.Text.Json;
using Backend.WebApi.Configuration;
using Backend.Mpa.Core;
using Microsoft.Extensions.FileProviders;

namespace Backend.WebApi;


public static class Program
{
	private static ILogger _logger = null!;

	private static void Main(string[] args)
	{
		var builder = WebApplication.CreateBuilder(args);
		InitializeLogger(builder);

		builder.Services.AddControllers()
			.AddJsonOptions(options =>
			{
				options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
				options.JsonSerializerOptions.Converters.Add(new JsonSerializerDefaults.DateTimeOffsetConverter());

				// options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
			});
		builder.Services.AddHttpContextAccessor();

		var executingAssembly = Assembly.GetExecutingAssembly();
		var otherRelevantAssemblies = Directory
			.GetFiles(AppContext.BaseDirectory, "Backend.*.dll")
			.Select(f => Assembly.Load(AssemblyName.GetAssemblyName(f)));
		// Add services to the container.
		new HandlerDiscovery(builder.Services, _logger)
			.RegisterCommandAndQueryHandlers([executingAssembly, .. otherRelevantAssemblies]);

		new ServiceDiscovery(builder.Services, _logger)
			.RegisterServices([executingAssembly, .. otherRelevantAssemblies]);

		new ControllerDiscovery(builder.Services, _logger)
			.RegisterControllers([executingAssembly, .. otherRelevantAssemblies]);

		builder.Services.Configure<DbConfig>(builder.Configuration.GetSection("AppConfig"));
		builder.Services.Configure<AppConfig>(builder.Configuration.GetSection("AppConfig"));
		builder.Services.Configure<JwtConfig>(builder.Configuration.GetSection("Jwt"));
		builder.Services.Configure<OidcConfig>(builder.Configuration.GetSection("Oidc"));
		builder.Services.Configure<KeycloakConfig>(builder.Configuration.GetSection("Keycloak"));

		builder.Services.AddScoped<IAuthorizationHandler, OrganizationRequirementAuthorizationHandler>();

		builder.Services.AddDbContext<MpaDbContext>();

		builder.Services.AddHttpClient();
		builder.Services.AddOptions();

		builder.Services.AddScoped<ImapClient>();

		builder.RegisterEndpoints();
		builder.RegisterSignalRServices();
		builder.RegisterAuthenticationServices();
		builder.RegisterKeycloakClient();

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
			// Make cert optional, so that the app can run without HTTPS if the cert is not provided
			// This is practical when running behind a reverse proxy that handles HTTPS termination, or in development environments
			var cert_file = "/data/https/server.pfx";
			var cert_password = builder.Configuration.GetValue<string>("CERTIFICATE_PASSWORD")?.TrimEnd('\n', '\r');

			// Read port from environment variable or default to 5054
			var portString = Environment.GetEnvironmentVariable("ASPNETCORE_HTTP_PORTS");
			var port = int.TryParse(portString, out var parsedPort) ? parsedPort : 5054;

			if (!string.IsNullOrEmpty(cert_password) && File.Exists(cert_file))
			{
				options.ListenAnyIP(port, listenOptions => { listenOptions.UseHttps(cert_file, cert_password); });
			}
			else
			{
				_logger.LogWarning("HTTPS certificate not found at {CertFile} or password missing. Starting Kestrel without HTTPS on port {Port}.", cert_file, port);
				options.ListenAnyIP(port);
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


	private static void RegisterAuthenticationServices(this WebApplicationBuilder builder)
	{
		var jwtOptions = new JwtConfig();
		builder.Configuration.GetSection("Jwt").Bind(jwtOptions);

		var oidcOptions = new OidcConfig();
		builder.Configuration.GetSection("Oidc").Bind(oidcOptions);

		var authenticationBuilder = builder.Services.AddAuthentication(options =>
		{
			options.DefaultAuthenticateScheme = CookieAuthenticationDefaults.AuthenticationScheme;
			options.DefaultChallengeScheme = CookieAuthenticationDefaults.AuthenticationScheme;
			options.DefaultSignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
		})
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
					IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.JwtSecret ?? throw new NullReferenceException("Missing 'JwtSecret' configuration setting.")))
				};

				options.Audience = jwtOptions.Audience;

			})
			.AddCookie(CookieAuthenticationDefaults.AuthenticationScheme, options =>
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

		if (oidcOptions.IsValidForLoginFlow())
		{
			authenticationBuilder.AddOpenIdConnect(OidcConfig.Scheme, options =>
			{
				options.SignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
				options.Authority = oidcOptions.Authority;
				options.ClientId = oidcOptions.ClientId;
				options.ClientSecret = string.IsNullOrWhiteSpace(oidcOptions.ClientSecret) ? null : oidcOptions.ClientSecret;
				options.CallbackPath = oidcOptions.CallbackPath;
				options.SignedOutCallbackPath = oidcOptions.SignedOutCallbackPath;
				options.ResponseType = "code";
				options.UsePkce = true;
				options.SaveTokens = true;
				options.GetClaimsFromUserInfoEndpoint = false;
				options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
				options.Scope.Add("email");
				options.Scope.Add("organization");
			});
		}

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


	private static void RegisterKeycloakClient(this WebApplicationBuilder builder)
	{
		var keycloakConfig = new KeycloakConfig();
		builder.Configuration.GetSection("Keycloak").Bind(keycloakConfig);

		builder.Services.AddHttpClient<KeycloakOrganizationClient>(client =>
		{
			client.BaseAddress = new Uri(keycloakConfig.BaseUrl!);
		})
		.AddHttpMessageHandler<KeycloakAuthHandler>();
	}


	private static void PrepareDatabase(this WebApplication app)
	{
		var services = app.Services;

		var dbConfig = services.GetRequiredService<IOptions<DbConfig>>().Value;
		var tenantId = "-1";
		var dbContext = new MpaDbContext(dbConfig, tenantId);  //tenantId -1 for default tenant when running db migrations scripts
		dbContext.Database.Migrate();
	}


	private static void Configure(this WebApplication app)
	{
		if (app.Environment.IsDevelopment())
		{
			app.UseDeveloperExceptionPage();
		}

		app.UseForwardedHeaders(new ForwardedHeadersOptions
		{
			ForwardedHeaders = ForwardedHeaders.XForwardedHost | ForwardedHeaders.XForwardedProto
		});

		app.UseHttpsRedirection();

		var webAppFilesPath = app.Configuration.GetSection("AppConfig")["WebAppFilesPath"];
		if (webAppFilesPath != null && Directory.Exists(webAppFilesPath))
		{
			_logger.LogWarning("Serving web app files from: {WebAppFilesPath}", webAppFilesPath);

			app.UseFileServer(new FileServerOptions
			{
				FileProvider = new PhysicalFileProvider(webAppFilesPath),
				RequestPath = "",
				EnableDefaultFiles = true,
				EnableDirectoryBrowsing = false
			});

		}

		app.UseAuthentication();
		app.UseAuthorization();

		app.UseWebSockets();
		app.MapHub<NotificationHub>("/notificationHub");

		app.MapControllers();
	}
}
