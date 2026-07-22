using Microsoft.Extensions.DependencyInjection;

namespace Backend.Core.Infrastructure;

public class RegisterServiceAttribute : Attribute
{
	public readonly ServiceLifetime Lifetime;
	public readonly RegistrationMode Mode;

	public RegisterServiceAttribute(ServiceLifetime lifetime = ServiceLifetime.Scoped, RegistrationMode mode = RegistrationMode.Auto)
	{
		Lifetime = lifetime;
		Mode = mode;
	}
}


[Flags]
public enum RegistrationMode
{
	/// <summary>
	/// Automatically determine whether to register the class as itself or its interfaces based on whether it implements any interfaces.
	/// If it implements interfaces, register as those interfaces; otherwise, register as itself.
	/// </summary>
	Auto = 0b00,

	/// <summary>
	/// Register the class as itself, regardless of whether it implements any interfaces.
	/// </summary>
	RegisterAsSelf = 0b01,

	/// <summary>
	/// Register the class as its interfaces, if it implements any.
	/// If it does not implement any interfaces, the class will NOT be registered.
	/// </summary>
	RegisterInterfaces = 0b10,

	/// <summary>
	/// Register the class as both itself and its interfaces, if it implements any interfaces.
	/// </summary>
	RegisterAsBoth = RegisterAsSelf | RegisterInterfaces
}
