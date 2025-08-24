public interface IEncryptionService
{
    MemoryStream Encrypt(Stream inputStream, string password);
    MemoryStream Decrypt(Stream encryptedStream, string password);
}