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
using Newtonsoft.Json;
using Backend.EmailIngestion;
using Backend.EmailIngestion.Providers;
using System.Net;
using Microsoft.AspNetCore.Authorization;
using System.Reflection;

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

		// Add services to the container.
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

		var executingAssembly = Assembly.GetExecutingAssembly();
		var otherRelevantAssemblies = executingAssembly.GetReferencedAssemblies().Where(x => x.Name!.StartsWith("Backend")).Select(Assembly.Load);	//TODO: Include only specific assemblies? All referenced assemblies could be a lot.
		new ServiceDiscovery(builder.Services, _logger)
			.DiscoverAndRegisterServices([executingAssembly, ..otherRelevantAssemblies]);

		builder.Services.AddOptions();

		builder.RegisterEndpoints();
		builder.RegisterSignalRServices();
		builder.RegisterAuthenticationServices();
		builder.RegisterBackupProviders();
		builder.RegisterEncryptionServics();
		builder.RegisterRestoreServices();
		builder.RegisterSwaggerServices();
		builder.RegisterEmailServices();

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
			if (!string.IsNullOrEmpty(cert_password) && File.Exists(cert_file))
			{
				options.Listen(IPAddress.Loopback, 5054, listenOptions => { listenOptions.UseHttps(cert_file, cert_password); });
			}
			else
			{
				_logger.LogWarning("HTTPS certificate not found at {CertFile} or password missing. Starting Kestrel without HTTPS on port 5054.", cert_file);
				options.Listen(IPAddress.Loopback, 5054);
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

		services.AddSingleton<TenantBackupManager>();
		services.AddSingleton<BackupProviderFactory>();

		services.AddScoped<BuddyTargetBackupProvider>();
	}

	private static void RegisterRestoreServices(this IHostApplicationBuilder builder)
	{
		var services = builder.Services;

		services.AddSingleton<TenantRestoreManager>();
	}

	private static void RegisterEncryptionServics(this IHostApplicationBuilder builder)
	{
		var services = builder.Services;

		services.AddSingleton<EncryptionProviderFactory>();

		services.AddScoped<OpenSslAes256Cbc>();
	}

	private static void RegisterEmailServices(this IHostApplicationBuilder builder)
	{
		var services = builder.Services;

		services.AddSingleton<ImapProviderBase, GmailProvider>();
		services.AddSingleton<ImapProviderBase, FastMailBasicAuthProvider>();
		services.AddSingleton<EmailProviderFactory>();
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

				// // Enable SignalR authentication via access token query string
				// options.Events = new JwtBearerEvents
				// {
				// 	OnMessageReceived = context =>
				// 	{
				// 		// If the request is for the SignalR hub, read the token from the query string
				// 		var path = context.HttpContext.Request.Path;
				// 		if (path.StartsWithSegments("/notificationHub"))
				// 		{
				// 			var accessToken = context.Request.Query["access_token"];
				// 			if (!string.IsNullOrEmpty(accessToken))
				// 			{
				// 				context.Token = accessToken;
				// 			}
				// 		}

				// 		return Task.CompletedTask;
				// 	}
				// };
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
			DemoDataGenerator.Seed(dbConfig);
		}
	}


	private static void Configure(this WebApplication app)
	{
		if (app.Environment.IsDevelopment())
		{
			app.UseSwagger();
			app.UseSwaggerUI();

			app.UseDeveloperExceptionPage();
		}

		app.UseHttpsRedirection();

		app.UseAuthentication();
		app.UseAuthorization();

		app.UseWebSockets();
		app.MapHub<NotificationHub>("/notificationHub");

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