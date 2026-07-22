using System.Reflection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Backend.Core.Infrastructure;

public class ServiceDiscovery
{
	private readonly IServiceCollection _services;
	private readonly ILogger _logger;

	public ServiceDiscovery(IServiceCollection services, ILogger logger)
	{
		_services = services;
		_logger = logger;
	}

	public ServiceDiscovery RegisterServices(IEnumerable<Assembly> assemblies)
	{
		_logger.LogInformation($"Discovering services with RegisterServiceAttribute in assemblies [{string.Join(", ", assemblies.Select(a => a.FullName))}]");


		var serviceTypes = assemblies
			.SelectMany(assembly => assembly.GetTypes())
			.Where(t => t.GetCustomAttributes<RegisterServiceAttribute>().Any());

		foreach (var serviceType in serviceTypes)
		{
			var attribute = serviceType.GetCustomAttribute<RegisterServiceAttribute>();
			if (attribute == null) continue;

			var interfacetypes = serviceType.GetInterfaces();

			if (attribute.Mode == RegistrationMode.Auto)
			{
				if (interfacetypes.Length == 0)
				{
					RegisterAsSelf(serviceType, attribute);
				}
				else
				{
					RegisterInterfaces(serviceType, attribute, interfacetypes);
				}
			}
			else
			{
				if (attribute.Mode.HasFlag(RegistrationMode.RegisterAsSelf))
				{
					RegisterAsSelf(serviceType, attribute);
				}

				if (attribute.Mode.HasFlag(RegistrationMode.RegisterInterfaces))
				{
					RegisterInterfaces(serviceType, attribute, interfacetypes);
				}
			}
		}

		return this;
	}

	private void RegisterInterfaces(Type serviceType, RegisterServiceAttribute attribute, Type[] interfacetypes)
	{
		// Register each interface implemented by the class
		_logger.LogInformation($"Registering service {serviceType.FullName} with interfaces [{string.Join(", ", interfacetypes.Select(i => i.FullName))}] and lifetime {attribute.Lifetime} in assembly {serviceType.Assembly.FullName}");
		foreach (var interfaceType in interfacetypes)
		{
			RegisterService(interfaceType, serviceType, attribute.Lifetime);
		}
	}

	private void RegisterAsSelf(Type serviceType, RegisterServiceAttribute attribute)
	{
		// No interfaces, register the class itself
		_logger.LogInformation($"Registering service {serviceType.FullName} with lifetime {attribute.Lifetime} in assembly {serviceType.Assembly.FullName}");
		RegisterService(serviceType, serviceType, attribute.Lifetime);
	}

	private void RegisterService(Type interfaceType, Type serviceType, ServiceLifetime lifetime)
	{
		switch (lifetime)
		{
			case ServiceLifetime.Singleton:
				_services.AddSingleton(interfaceType, serviceType);
				break;
			case ServiceLifetime.Scoped:
				_services.AddScoped(interfaceType, serviceType);
				break;
			case ServiceLifetime.Transient:
				_services.AddTransient(interfaceType, serviceType);
				break;
		}
	}
}
