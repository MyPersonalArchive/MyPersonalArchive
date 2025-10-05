public class EmailIngestionProviderFactory
{
    private readonly Dictionary<string, IEmailIngestionProvider> _providers;

    public EmailIngestionProviderFactory(IEnumerable<IEmailIngestionProvider> providers)
    {
        _providers = providers.ToDictionary(p => p.Name, StringComparer.OrdinalIgnoreCase);
    }

    public bool TryGetProvider(string name, out IEmailIngestionProvider provider)
    {
        return _providers.TryGetValue(name, out provider!);
    }
}