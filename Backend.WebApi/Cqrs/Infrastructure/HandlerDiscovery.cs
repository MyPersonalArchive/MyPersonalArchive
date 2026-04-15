using System.Reflection;
using Backend.Core.Cqrs.Infrastructure;

namespace Backend.WebApi.Cqrs.Infrastructure;


public class HandlerDiscovery
{
	private readonly IServiceCollection _services;
	private readonly ILogger _logger;

	public HandlerDiscovery(IServiceCollection services, ILogger logger)
	{
		_services = services;
		_logger = logger;
	}

	public IServiceCollection RegisterCommandAndQueryHandlers(IEnumerable<Assembly> assemblies)
	{
		_logger.LogInformation("Discovering Commands and Queries...");

		// Register all handlers
		var handlerTypes = assemblies
			.SelectMany(assembly => assembly.GetTypes())
			.Where(type => type.IsClass && !type.IsAbstract)
			.Where(type => typeof(IHandler).IsAssignableFrom(type))
			.ToList();

		foreach (var handlerType in handlerTypes)
		{
			_logger.LogInformation($"\tRegistering query handler: {handlerType.FullName}");
			_services.AddTransient(handlerType);
		}

		return _services;
	}
}

