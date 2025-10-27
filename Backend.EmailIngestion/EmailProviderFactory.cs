using Backend.EmailIngestion.Providers;

namespace Backend.EmailIngestion;

public class EmailProviderFactory
{
	private readonly Dictionary<string, ImapProviderBase> _providers;

	public EmailProviderFactory(IEnumerable<ImapProviderBase> providers)
	{
		_providers = providers.ToDictionary(p => p.Name, StringComparer.OrdinalIgnoreCase);
	}

	public bool TryGetProvider(string name, out ImapProviderBase provider)
	{
		return _providers.TryGetValue(name, out provider!);
	}
}