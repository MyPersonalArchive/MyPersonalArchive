public class EmailIngestionProviderFactory
{
    private readonly Dictionary<string, IEmailIngestionProvider> _providers;

    public EmailIngestionProviderFactory(IEnumerable<IEmailIngestionProvider> providers)
    {
        _providers = providers.ToDictionary(p => p.Name, StringComparer.OrdinalIgnoreCase);
    }

    public IEmailIngestionProvider? Get(string name) =>
        _providers.TryGetValue(name, out var provider) ? provider : null;

    public bool TryGetProvider(string name, out IEmailIngestionProvider provider)
    {
        var res = _providers.TryGetValue(name, out var prov);
        provider = prov;
        return res;
    }
}