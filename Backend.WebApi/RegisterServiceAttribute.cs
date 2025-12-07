using System.Reflection;

namespace Backend.WebApi;

public class RegisterServiceAttribute : Attribute
{
	public readonly ServiceLifetime Lifetime;
	public string? Key{get;set;}

	public RegisterServiceAttribute(ServiceLifetime lifetime = ServiceLifetime.Scoped){
		Lifetime = lifetime;
	}
}
