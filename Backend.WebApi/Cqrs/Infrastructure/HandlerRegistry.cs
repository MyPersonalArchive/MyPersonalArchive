namespace Backend.WebApi.Cqrs.Infrastructure;

public class HandlerRegistry
{
	private readonly IReadOnlyDictionary<string, Type> _queryHandlers;
	private readonly IReadOnlyDictionary<string, Type> _commandHandlers;

	public HandlerRegistry(IReadOnlyDictionary<string, Type> queryHandlers, IReadOnlyDictionary<string, Type> commandHandlers)
	{
		_queryHandlers = queryHandlers;
		_commandHandlers = commandHandlers;
	}

	public Type? ResolveQueryHandler(string queryName)
		=> _queryHandlers.GetValueOrDefault(queryName.ToLowerInvariant());

	public Type? ResolveCommandHandler(string commandName)
		=> _commandHandlers.GetValueOrDefault(commandName.ToLowerInvariant());
}
