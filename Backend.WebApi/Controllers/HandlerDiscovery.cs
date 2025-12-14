using System.Reflection;

namespace Backend.WebApi;


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
		var assembly = typeof(HandlerDiscovery).Assembly;

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

#region IHandler and related interfaces
public interface IHandler
{
	// marker interface
}


// Query interfaces
public interface IQuery<TQuery, TResult>
where TQuery : IQuery<TQuery, TResult>
{
}

public interface IAsyncQueryHandler<TQuery, TResult> : IHandler
	where TQuery : IQuery<TQuery, TResult>
{
	Task<TResult> Handle(TQuery query);
}

public interface IQueryHandler<TQuery, TResult> : IHandler
	where TQuery : IQuery<TQuery, TResult>
{
	TResult Handle(TQuery query);
}


// Command interfaces
public interface ICommand<TCommand> where TCommand : ICommand<TCommand>
{
}

public interface ICommandHandler<TCommand> : IHandler where TCommand : ICommand<TCommand>
{
	Task Handle(TCommand command);
}
#endregion