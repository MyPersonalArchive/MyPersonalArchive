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

		var queryHandlers = new Dictionary<string, Type>();
		var commandHandlers = new Dictionary<string, Type>();

		// Register all handlers
		var handlerTypes = assemblies
			.SelectMany(assembly => assembly.GetTypes())
			.Where(type => type is { IsClass: true, IsAbstract: false })
			.Where(type => typeof(IHandler).IsAssignableFrom(type))
			.ToList();

		foreach (var handlerType in handlerTypes)
		{
			_logger.LogInformation($"\tRegistering handler: {handlerType.FullName}");
			_services.AddTransient(handlerType);

			foreach (var iface in handlerType.GetInterfaces().Where(i => i.IsGenericType))
			{
				var def = iface.GetGenericTypeDefinition();
				if (def == typeof(IAsyncQueryHandler<,>) || def == typeof(IQueryHandler<,>))
				{
					var queryName = iface.GetGenericArguments()[0].Name.ToLowerInvariant();
					queryHandlers[queryName] = handlerType;
				}
				else if (def == typeof(IAsyncCommandHandler<>) || def == typeof(ICommandHandler<>))
				{
					var commandName = iface.GetGenericArguments()[0].Name.ToLowerInvariant();
					commandHandlers[commandName] = handlerType;
				}
			}
		}

		_services.AddSingleton(new HandlerRegistry(queryHandlers, commandHandlers));

		return _services;
	}
}

