using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.WebApi.CqrsInfrastructure;


[ApiController]
[Route("api/")]
[Authorize]
[AllowAnonymous]
public class DispatchController : ControllerBase
{
	private readonly ILogger<DispatchController> _logger;
	private readonly IServiceProvider _services;

	private readonly JsonSerializerOptions _serializerOptions = new()
	{
		PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
	};


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

		// Get the query handler for current query by the handlers interface
		var handlerInterface = GetQueryHandlerInterface(queryName, queryHandlerType);
		var queryType = handlerInterface.GetGenericArguments()[0];

		var failureReasons = CheckRequirements(queryType);
		if (failureReasons.Any())
		{
			return BadRequest(string.Join("; ", failureReasons));
		}

		var handler = _services.GetRequiredService(queryHandlerType);
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

		// Get the query handler for current query by the handlers interface
		var handlerInterface = GetQueryHandlerInterface(queryName, queryHandlerType);
		var queryType = handlerInterface.GetGenericArguments()[0];

		var failureReasons = CheckRequirements(queryType);
		if (failureReasons.Any())
		{
			return BadRequest(string.Join("; ", failureReasons));
		}

		var handler = _services.GetRequiredService(queryHandlerType);
		var handleMethod = queryHandlerType.GetMethod("Handle", [queryType])!;

		// Create query instance and map parameters
		var query = JsonSerializer.Deserialize(await new StreamReader(Request.Body).ReadToEndAsync(), queryType, _serializerOptions);

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

		// Get the query handler for current query by the handlers interface
		var handlerInterface = GetCommandHandlerInterface(commandName, commandHandlerType);
		var commandType = handlerInterface.GetGenericArguments()[0];

		var failureReasons = CheckRequirements(commandType);
		if (failureReasons.Any())
		{
			return BadRequest(string.Join("; ", failureReasons));
		}

		var handler = _services.GetRequiredService(commandHandlerType);
		var handleMethod = commandHandlerType.GetMethod("Handle", [commandType])!;

		// Create query instance and map parameters
		var command = JsonSerializer.Deserialize(await new StreamReader(Request.Body).ReadToEndAsync(), commandType, _serializerOptions);

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

		// Get the query handler for current query by the handlers interface
		var handlerInterface = GetCommandHandlerInterface(commandName, commandHandlerType);
		var commandType = handlerInterface.GetGenericArguments()[0];

		var failureReasons = CheckRequirements(commandType);
		if (failureReasons.Any())
		{
			return BadRequest(string.Join("; ", failureReasons));
		}

		var handler = _services.GetRequiredService(commandHandlerType);
		var handleMethod = commandHandlerType.GetMethod("Handle", [commandType])!;

		// Create query instance and map parameters
		var command = JsonSerializer.Deserialize(await new StreamReader(Request.Body).ReadToEndAsync(), commandType, _serializerOptions);

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

	[HttpDelete("execute/{commandName}")]
	public async Task<IActionResult> DeleteCommand(string commandName, [FromQuery] Dictionary<string, string> parameters)
	{
		var commandHandlerType = ResolveCommandHandler(commandName);

		if (commandHandlerType == null)
		{
			return BadRequest("Unknown command");
		}

		// Get the query handler for current query by the handlers interface
		var handlerInterface = GetCommandHandlerInterface(commandName, commandHandlerType);
		var commandType = handlerInterface.GetGenericArguments()[0];

		var failureReasons = CheckRequirements(commandType);
		if (failureReasons.Any())
		{
			return BadRequest(string.Join("; ", failureReasons));
		}

		var handler = _services.GetRequiredService(commandHandlerType);
		var handleMethod = commandHandlerType.GetMethod("Handle", [commandType])!;

		// Create query instance and map parameters
		var command = Activator.CreateInstance(commandType);
		MapParametersToObject(command!, parameters);

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


	private IEnumerable<string> CheckRequirements(Type queryOrCommandType)
	{
		var currentAttributes = queryOrCommandType.GetCustomAttributes(typeof(IRequirement), true).Cast<IRequirement>();
		//Mandatory attribute "types": authentication requirement, permission requirement, etc.
		//Optional attribute "types": tenant requirement, feature flag requirement, etc.

		var requiredAttributes = new Type[] { typeof(RequireAuthenticationAttribute) };
		var missingRequiredAttributes = requiredAttributes
			.Where(requiredAttributeType =>
				!currentAttributes.Any(
					attr =>
						attr.GetType().IsAssignableTo(requiredAttributeType)
					)
				)
			.ToList();
		if (missingRequiredAttributes.Any())
		{
			return [$"Missing required requirement attributes: {string.Join(", ", missingRequiredAttributes.Select(t => t.Name))}"];
		}

		var failureReasons = new List<string>();
		foreach (IRequirement attr in currentAttributes)
		{
			if (attr.TryCheck(HttpContext, _logger, out var failureReason) == false)
			{
				failureReasons.Add(failureReason!);
			}
		}
		return failureReasons;
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
					// Skip properties that can't be converted
				}
			}
		}
	}
}
