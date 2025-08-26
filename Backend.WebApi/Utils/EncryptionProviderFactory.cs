
public class EncryptionProviderFactory
{
    public IEncryptionService? CurrentProvider { get; private set; }

    public EncryptionProviderFactory()
    {
        SetProvider("None");
    }

    public void SetProvider(string providerName)
    {
        switch (providerName)
        {
            case "None":
                CurrentProvider = new NoEncryptionService();
                break;
            case "AesOpenssl":
                CurrentProvider = new OpenSslAes256Cbc();
                break;
            default:
                throw new NotSupportedException($"Provider {providerName} is not supported");
        }

        Console.WriteLine($"Encryption provider set to {providerName}");
    }
}

public class NoEncryptionService : IEncryptionService
{
    public MemoryStream Encrypt(Stream inputStream, string password)
    {
        return (MemoryStream)inputStream;
    }

    public MemoryStream Decrypt(Stream encryptedStream, string password)
    {
        return (MemoryStream)encryptedStream;
    }
}