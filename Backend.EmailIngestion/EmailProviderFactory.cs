public class EmailProviderFactory
{
    private readonly Dictionary<string, IEmailProvider> _providers;

    public EmailProviderFactory(IEnumerable<IEmailProvider> providers)
    {
        _providers = providers.ToDictionary(p => p.Name, StringComparer.OrdinalIgnoreCase);
    }

    public bool TryGetProvider(string name, out IEmailProvider provider)
    {
        return _providers.TryGetValue(name, out provider!);
    }
}