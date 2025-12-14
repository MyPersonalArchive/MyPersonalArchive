using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Backend.WebApi.Controllers;


[ApiController]
[Route("api/")]
public class DispatchController : ControllerBase
{
	private readonly ILogger<DispatchController> _logger;
	private readonly IServiceProvider _services;


	public DispatchController(IServiceProvider services, ILogger<DispatchController> logger)
	{
		_logger = logger;
		_services = services;
	}


	[HttpGet("query/{queryName}")]
	public async Task<IActionResult> GetQuery(string queryName, [FromQuery] Dictionary<string, string> parameters)
	{
		var queryHandlerType = ResolveQueryHandler(queryName);

		if (queryHandlerType == null)
		{
			return BadRequest("Unknown query");
		}

		// check requirements, e.g. authentication, authorization, featureflags, validation, etc.

		// Get the query type from the handler's interface
		var queryInterface = queryHandlerType.GetInterfaces()
			.First(i => i.IsGenericType
				&& (
					i.GetGenericTypeDefinition() == typeof(IAsyncQueryHandler<,>)
					|| i.GetGenericTypeDefinition() == typeof(IQueryHandler<,>)
				)
				&& i.GetGenericArguments()[0].Name.Equals(queryName, StringComparison.OrdinalIgnoreCase)
			);
		var queryType = queryInterface.GetGenericArguments()[0];

		// Create query instance and map parameters
		var query = Activator.CreateInstance(queryType);
		MapParametersToObject(query!, parameters);

		// Get handler from DI container
		var handler = _services.GetRequiredService(queryHandlerType);

		// Invoke Handle method for the specific query type
		var handleMethod = queryHandlerType.GetMethod("Handle", [queryType])!;
		
		// Check if handler is async or sync
		if (handleMethod.ReturnType.IsGenericType && handleMethod.ReturnType.GetGenericTypeDefinition() == typeof(Task<>))
		{
			// Async handler
			var task = (Task)handleMethod.Invoke(handler, [query])!;
			await task.ConfigureAwait(false);

			// Get result from task
			var resultProperty = task.GetType().GetProperty("Result");
			var result = resultProperty!.GetValue(task);

			return Ok(result);
		}
		else
		{
			// Sync handler
			var result = handleMethod.Invoke(handler, [query]);
			return Ok(result);
		}
	}


	[HttpPost("query/{queryName}")]
	public IActionResult PostQuery(string queryName)
	{
		throw new NotImplementedException();
	}

	[HttpPost("execute/{commandName}")]
	public async Task<IActionResult> PostCommand(string commandName, [FromBody] Dictionary<string, object> parameters)
	{
		var commandHandlerType = ResolveCommandHandler(commandName);

		if (commandHandlerType == null)
		{
			return BadRequest("Unknown command");
		}

		// check requirements, e.g. authentication, authorization, featureflags, validation, etc.

		// Get the command type from the handler's interface
		var commandInterface = commandHandlerType.GetInterfaces()
			.First(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(ICommandHandler<>));
		var commandType = commandInterface.GetGenericArguments()[0];

		// Create command instance and map parameters
		var command = Activator.CreateInstance(commandType);
		MapParametersToObject(command!, parameters.ToDictionary(kv => kv.Key, kv => kv.Value.ToString()!)); //TODO: Fix mapping!

		// Get handler from DI container
		var handler = _services.GetRequiredService(commandHandlerType);

		// Invoke Handle method
		var handleMethod = commandHandlerType.GetMethod("Handle");
		var task = (Task)handleMethod!.Invoke(handler, [command])!;
		await task.ConfigureAwait(false);

		return Ok();
	}


	[HttpPut("command/{commandName}")]
	public IActionResult PutCommand(string commandName)
	{
		throw new NotImplementedException();
	}

	private Type? ResolveQueryHandler(string queryName)
	{
		var assembly = typeof(DispatchController).Assembly;

		// Get queryhandlers that can handle the query with the given name
		var queryHandlerType = assembly.GetTypes()
			.Where(type => type.IsClass && !type.IsAbstract)
			.Where(type => type.GetInterfaces()
				.Any(i => i.IsGenericType
					&& (
						i.GetGenericTypeDefinition() == typeof(IAsyncQueryHandler<,>) 
						|| i.GetGenericTypeDefinition() == typeof(IQueryHandler<,>)
					)
					&& i.GetGenericArguments()[0].Name.Equals(queryName, StringComparison.OrdinalIgnoreCase)
				))
			.SingleOrDefault();

		return queryHandlerType;
	}

	private Type? ResolveCommandHandler(string commandName)
	{
		var assembly = typeof(DispatchController).Assembly;

		// Get all types implementing ICommandHandler<TCommand>
		var commandHandlerTypes = assembly.GetTypes()
			.Where(type => type.IsClass && !type.IsAbstract)
			.Where(type => type.GetInterfaces()
				.Any(i => i.IsGenericType
					&& i.GetGenericTypeDefinition() == typeof(ICommandHandler<>)
					&& i.GetGenericArguments()[0].Name.Equals(commandName, StringComparison.OrdinalIgnoreCase)
				))
			.SingleOrDefault();

		return commandHandlerTypes;
	}


	private void MapParametersToObject(object target, Dictionary<string, string> parameters)
	{
		var targetType = target.GetType();

		foreach (var param in parameters)
		{
			var property = targetType.GetProperty(param.Key,
				System.Reflection.BindingFlags.Public |
				System.Reflection.BindingFlags.Instance |
				System.Reflection.BindingFlags.IgnoreCase);

			if (property != null && property.CanWrite)
			{
				try
				{
					var convertedValue = Convert.ChangeType(param.Value, property.PropertyType);
					property.SetValue(target, convertedValue);
				}
				catch
				{
					//TODO: How to convert complex types?

					// Skip properties that can't be converted
				}
			}
		}
	}

}
