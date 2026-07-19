// See https://aka.ms/new-console-template for more information
using Backend.Core;
using Backend.Core.Infrastructure;
using Backend.Core.Providers.Store;
using Backend.Core.Services;
using Backend.Mpa.Core.Services;
using Backend.Mpa.Core.Store;
using Backend.Mpa.DbModel.Database;
using ConsoleApp1;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Reflection;


internal class Program
{
	private static async Task Main(string[] args)
	{
		// var (hashedPassword, salt ) = PasswordHasher.HashPassword("some-password");
		// Console.WriteLine($"hashedPassword: {Convert.ToBase64String(hashedPassword)}");
		// Console.WriteLine($"salt: {Convert.ToBase64String(salt)}");

		Console.WriteLine("Hello!");

		var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");

		var config = new ConfigurationBuilder()
			.SetBasePath(AppDomain.CurrentDomain.BaseDirectory) // Set the base path
			.AddJsonFile("appsettings.json", optional: true, reloadOnChange: true) // Load from JSON
			.AddJsonFile($"appsettings.{environment}.json", optional: true, reloadOnChange: true) // Load from JSON
			.AddEnvironmentVariables() // Load from Environment Variables
			.AddCommandLine(args) // Load from Command-Line Arguments
			.Build();

		var serviceCollection = new ServiceCollection();

		// var serviceDiscovery = new ServiceDiscovery(serviceCollection, new LoggerFactory().CreateLogger<ServiceDiscovery>());
		var otherRelevantAssemblies = Directory
			.GetFiles(AppContext.BaseDirectory, "Backend.*.dll")
			.Select(f => Assembly.Load(AssemblyName.GetAssemblyName(f)));
		// serviceDiscovery.RegisterServices([Assembly.GetExecutingAssembly(), .. otherRelevantAssemblies]);

		var serviceProvider = serviceCollection
			.AddLogging()
			.AddScoped<IAmbientDataResolver>(sp => new DummyAmbientDataResolver())
			.AddTransient<MpaDbContext>(sp =>
			{
				var dbConfig = sp.GetRequiredService<IOptions<DbConfig>>().Value;
				var ambientDataResolver = (DummyAmbientDataResolver)sp.GetRequiredService<IAmbientDataResolver>();
				var tenantId = ambientDataResolver.TenantId;
				return new MpaDbContext(dbConfig, tenantId);
			})
			.AddTransient<IFileStore, FileSystemFileStore>()
			.AddScoped<ArchiveItemService>()
			.AddScoped<BlobService>()
			.AddScoped<BlobObjectStore>()
			.AddScoped<BlobObjectStoreFileStoreFactory>()
			.AddScoped<ISignalRService, DummySignalRService>()
			.AddScoped<DemoDataGenerator>()
			.AddOptions()
			.Configure<AppConfig>(config.GetSection(nameof(AppConfig)))
			.Configure<DbConfig>(config.GetSection(nameof(AppConfig)))
			.BuildServiceProvider();

		await SeedArchiveItems(serviceProvider);

		await DoSomethingWithArchiveItemService(serviceProvider);


		Console.WriteLine("Goodbye!");
	}

	private static async Task DoSomethingWithArchiveItemService(ServiceProvider serviceProvider)
	{
		using var scope = serviceProvider.CreateScope();
		var dummyAmbientDataResolver = (DummyAmbientDataResolver)scope.ServiceProvider.GetService<IAmbientDataResolver>()!;
		dummyAmbientDataResolver.TenantId = 1;
		dummyAmbientDataResolver.Username = "admin@localhost";
	
		var archiveItemService = scope.ServiceProvider.GetService<ArchiveItemService>()!;
	
		var stopwatch = System.Diagnostics.Stopwatch.StartNew();
		// var allocatedBlobCount = await archiveItemService.CountAllocatedBlobs();
		stopwatch.Stop();
		// Console.WriteLine($"Retrieved {allocatedBlobCount} allocated blobs in {stopwatch.ElapsedMilliseconds} ms");
	}


	private static async Task SeedArchiveItems(ServiceProvider serviceProvider)
	{
		var demoDataGenerator = new DemoDataGenerator(serviceProvider);
		await demoDataGenerator!.Seed();
	}
}
