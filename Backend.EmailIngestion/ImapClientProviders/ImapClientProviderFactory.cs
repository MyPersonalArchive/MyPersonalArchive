namespace Backend.EmailIngestion.ImapClientProviders;

public class ImapClientProviderFactory
{
	private readonly Dictionary<string, ImapClientProviderBase> _providers;

	public ImapClientProviderFactory(IEnumerable<ImapClientProviderBase> providers)
	{
		_providers = providers.ToDictionary(p => p.Name, StringComparer.OrdinalIgnoreCase);
	}

	public bool TryGetProvider(string name, out ImapClientProviderBase provider)
	{
		return _providers.TryGetValue(name, out provider!);
	}
}