using System.Diagnostics;
using System.Text.Json;
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

		// Get the query handler for current query by the handlers interface
		var handlerInterface = GetQueryHandlerInterface(queryName, queryHandlerType);
		var handler = _services.GetRequiredService(queryHandlerType);
		var queryType = handlerInterface.GetGenericArguments()[0];

		var handleMethod = queryHandlerType.GetMethod("Handle", [queryType])!;

		// Create query instance and map parameters
		var query = Activator.CreateInstance(queryType);
		MapParametersToObject(query!, parameters);

		if (IsHandleMethodAwaitable(handleMethod))
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
	public async Task<IActionResult> PostQuery(string queryName)
	{
		var queryHandlerType = ResolveQueryHandler(queryName);

		if (queryHandlerType == null)
		{
			return BadRequest("Unknown query");
		}

		// check requirements, e.g. authentication, authorization, featureflags, validation, etc.

		// Get the query handler for current query by the handlers interface
		var handlerInterface = GetQueryHandlerInterface(queryName, queryHandlerType);
		var handler = _services.GetRequiredService(queryHandlerType);
		var queryType = handlerInterface.GetGenericArguments()[0];

		var handleMethod = queryHandlerType.GetMethod("Handle", [queryType])!;

		// Create query instance and map parameters
		var query = JsonSerializer.Deserialize(await new StreamReader(Request.Body).ReadToEndAsync(), queryType);

		if (IsHandleMethodAwaitable(handleMethod))
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


	[HttpPost("execute/{commandName}")]
	public async Task<IActionResult> PostCommand(string commandName)
	{
		var commandHandlerType = ResolveCommandHandler(commandName);

		if (commandHandlerType == null)
		{
			return BadRequest("Unknown command");
		}

		// check requirements, e.g. authentication, authorization, featureflags, validation, etc.

		// Get the query handler for current query by the handlers interface
		var handlerInterface = GetCommandHandlerInterface(commandName, commandHandlerType);
		var handler = _services.GetRequiredService(commandHandlerType);
		var commandType = handlerInterface.GetGenericArguments()[0];

		var handleMethod = commandHandlerType.GetMethod("Handle", [commandType])!;
		// Create query instance and map parameters
		var command = JsonSerializer.Deserialize(await new StreamReader(Request.Body).ReadToEndAsync(), commandType);

		// Check if handler is async or sync
		if (IsHandleMethodAwaitable(handleMethod))
		{
			// Async handler
			var task = (Task)handleMethod.Invoke(handler, [command])!;
			await task.ConfigureAwait(false);
		}
		else
		{
			// Sync handler
			var result = handleMethod.Invoke(handler, [command]);
		}

		return NoContent();
	}


	[HttpPut("execute/{commandName}")]
	public async Task<IActionResult> PutCommand(string commandName)
	{
		var commandHandlerType = ResolveCommandHandler(commandName);

		if (commandHandlerType == null)
		{
			return BadRequest("Unknown command");
		}

		// check requirements, e.g. authentication, authorization, featureflags, validation, etc.

		// Get the query handler for current query by the handlers interface
		var handlerInterface = GetCommandHandlerInterface(commandName, commandHandlerType);
		var handler = _services.GetRequiredService(commandHandlerType);
		var commandType = handlerInterface.GetGenericArguments()[0];

		var handleMethod = commandHandlerType.GetMethod("Handle", [commandType])!;
		// Create query instance and map parameters
		var command = JsonSerializer.Deserialize(await new StreamReader(Request.Body).ReadToEndAsync(), commandType);

		// Check if handler is async or sync
		if (IsHandleMethodAwaitable(handleMethod))
		{
			// Async handler
			var task = (Task)handleMethod.Invoke(handler, [command])!;
			await task.ConfigureAwait(false);
		}
		else
		{
			// Sync handler
			var result = handleMethod.Invoke(handler, [command]);
		}

		return NoContent();	}

	private Type? ResolveQueryHandler(string queryName)
	{
		//TODO: Consider caching the results for performance
		//TODO: How to handle multiple assemblies? All relevant assemblies should be scanned.

		var assembly = typeof(DispatchController).Assembly;

		// Get queryhandlers that can handle the query with the given name
		return assembly.GetTypes()
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
	}


	private Type? ResolveCommandHandler(string commandName)
	{
		var assembly = typeof(DispatchController).Assembly;

		// Get all types implementing ICommandHandler<TCommand>
		return assembly.GetTypes()
			.Where(type => type.IsClass && !type.IsAbstract)
			.Where(type => type.GetInterfaces()
				.Any(i => i.IsGenericType
					&& (
						i.GetGenericTypeDefinition() == typeof(IAsyncCommandHandler<>)
						|| i.GetGenericTypeDefinition() == typeof(ICommandHandler<>)
					)
					&& i.GetGenericArguments()[0].Name.Equals(commandName, StringComparison.OrdinalIgnoreCase)
				))
			.SingleOrDefault();
	}


	private static Type GetQueryHandlerInterface(string queryName, Type queryHandlerType)
	{
		return queryHandlerType.GetInterfaces()
			.First(i => i.IsGenericType
				&& (
					i.GetGenericTypeDefinition() == typeof(IAsyncQueryHandler<,>)
					|| i.GetGenericTypeDefinition() == typeof(IQueryHandler<,>)
				)
				&& i.GetGenericArguments()[0].Name.Equals(queryName, StringComparison.OrdinalIgnoreCase)
			);
	}


	private static Type GetCommandHandlerInterface(string commandName, Type commandHandlerType)
	{
		return commandHandlerType.GetInterfaces()
			.First(i => i.IsGenericType
				&& (
					i.GetGenericTypeDefinition() == typeof(IAsyncCommandHandler<>)
					|| i.GetGenericTypeDefinition() == typeof(ICommandHandler<>)
				)
				&& i.GetGenericArguments()[0].Name.Equals(commandName, StringComparison.OrdinalIgnoreCase)
			);
	}


	private static bool IsHandleMethodAwaitable(System.Reflection.MethodInfo handleMethod)
	{
		return handleMethod.ReturnType.IsGenericType && handleMethod.ReturnType.GetGenericTypeDefinition() == typeof(Task<>);
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
