using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;

public class OpenSslAes256Cbc : IEncryptionService
{
    private const int KeySize = 32;      // 256-bit AES
    private const int IvSize = 16;       // 128-bit IV
    private const int SaltSize = 8;      // 8-byte salt for OpenSSL compatibility
    private const int Iterations = 100_000; // PBKDF2 iterations
    private static readonly byte[] SaltHeader = Encoding.ASCII.GetBytes("Salted__"); // OpenSSL magic header

    public MemoryStream Encrypt(Stream inputStream, string password)
    {
        byte[] salt = GenerateRandomBytes(SaltSize);
        byte[] key = DeriveKey(password, salt, KeySize);
        byte[] iv = GenerateRandomBytes(IvSize); // Generate random IV

        using Aes aes = Aes.Create();
        aes.KeySize = 256;
        aes.Key = key;
        aes.IV = iv;
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;

        var outputStream = new MemoryStream();

        // Write OpenSSL-compatible header: "Salted__" + 8-byte salt + IV
        outputStream.Write(SaltHeader, 0, SaltHeader.Length);
        outputStream.Write(salt, 0, salt.Length);
        outputStream.Write(iv, 0, iv.Length); // Include IV for OpenSSL compatibility

        using var cryptoStream = new CryptoStream(outputStream, aes.CreateEncryptor(), CryptoStreamMode.Write, leaveOpen: true);
        inputStream.CopyTo(cryptoStream);
        cryptoStream.FlushFinalBlock();

        Console.WriteLine("Key: " + BitConverter.ToString(key).Replace("-", "").ToLower());
        Console.WriteLine("Salt: " + BitConverter.ToString(salt).Replace("-", "").ToLower());
        Console.WriteLine("IV: " + BitConverter.ToString(iv).Replace("-", "").ToLower());

        outputStream.Position = 0;
        return outputStream;
    }

    public MemoryStream Decrypt(Stream encryptedStream, string password)
    {
        byte[] header = new byte[SaltHeader.Length];
        encryptedStream.ReadExactly(header, 0, SaltHeader.Length);
        if (!header.AsSpan().SequenceEqual(SaltHeader))
            throw new CryptographicException("Invalid OpenSSL header");

        byte[] salt = new byte[SaltSize];
        encryptedStream.ReadExactly(salt, 0, SaltSize);

        byte[] iv = new byte[IvSize];
        encryptedStream.ReadExactly(iv, 0, IvSize);

        byte[] key = DeriveKey(password, salt, KeySize);

        using Aes aes = Aes.Create();
        aes.KeySize = 256;
        aes.Key = key;
        aes.IV = iv;
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;

        using var cryptoStream = new CryptoStream(encryptedStream, aes.CreateDecryptor(), CryptoStreamMode.Read);
        var outputStream = new MemoryStream();
        cryptoStream.CopyTo(outputStream);
        outputStream.Position = 0;
        return outputStream;
    }

    private static byte[] DeriveKey(string password, byte[] salt, int keySize)
    {
        using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, Iterations, HashAlgorithmName.SHA256);
        return pbkdf2.GetBytes(keySize);
    }

    private static byte[] GenerateRandomBytes(int length)
    {
        byte[] bytes = new byte[length];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return bytes;
    }
}