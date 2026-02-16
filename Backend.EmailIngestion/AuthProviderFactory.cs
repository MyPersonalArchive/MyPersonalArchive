using Backend.EmailIngestion.Providers;

namespace Backend.EmailIngestion;

public class AuthProviderFactory
{
	private readonly Dictionary<string, AuthProviderBase> _providers;

	public AuthProviderFactory(IEnumerable<AuthProviderBase> providers)
	{
		_providers = providers.ToDictionary(p => p.Name, StringComparer.OrdinalIgnoreCase);
	}

	public bool TryGetProvider(string name, out AuthProviderBase provider)
	{
		return _providers.TryGetValue(name, out provider!);
	}
}