using System.Reflection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Backend.Core.Infrastructure;


public class ControllerDiscovery
{
	private IServiceCollection services;
	private ILogger logger;

	public ControllerDiscovery(IServiceCollection services, ILogger logger)
	{
		this.services = services;
		this.logger = logger;
	}

	public void RegisterControllers(IEnumerable<Assembly> assemblies)
	{
		var mvcBuilder = services.AddControllers();
		foreach (var assembly in assemblies)
		{
			mvcBuilder.AddApplicationPart(assembly);
			logger.LogInformation($"Registered controllers from assembly: {assembly.FullName}");
		}
	}
}