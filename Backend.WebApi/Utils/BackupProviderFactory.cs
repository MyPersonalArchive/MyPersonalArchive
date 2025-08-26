public class BackupProviderFactory
{
    public IBackupProvider? CurrentProvider { get; private set; }

    public BackupProviderFactory()
    {
        SetProvider("BuddyTarget");
    }

    public void SetProvider(string providerName)
    {
        switch (providerName)
        {
            case "BuddyTarget":
                CurrentProvider = new BuddyTargetBackupProvider();
                break;
            default:
                throw new NotSupportedException($"Provider {providerName} is not supported");
        }

        Console.WriteLine($"Backup provider set to {providerName}");
    }
}