using System.Security.Cryptography;

public class CipherService
{
    private readonly RSA _rsaMasterKey;
    

    //OBS: ONLY FOR DEBUG PURPOSES, DO NOT USE IN PRODUCTION
    const string privateKeyPem = @"
-----BEGIN RSA PRIVATE KEY-----
MIIEogIBAAKCAQEAvaZjGPqjzCQ7PO09LNLXYxbJUPZUuD77TSkupk6Gd982xWn5
1SYjIq//jBKIZwf1/IHD1hlNyLlSChZIhVTv9iIqpoWPnDi8eex4RTERUf3zFqWT
TZnTA/VuqhxDRhh59E7BQ+jCAHlQvqr9eIFWQgRMJGxoYeABIjOFYhubEYnBSCpO
GDG7dGQN2T5GoEabDQC+6WWRyxqkjeZN6d6Zh8Yo4R1YQ7hx3/xqueuvYYSgrXXd
DD12SPFKyHcEeP38xQXCi1yyRJVADkAN6qOqg6FEq+b+ZiCCpp2a0+7a+VLIvtRE
WDXMpVFIDfWDxkCiPQ+VYu74Fkjf6xEjnkFiSwIDAQABAoIBAGYlEcbIaCRxdz5v
gL19qeiCw1dJ9YNu2KdMgQWt0ZsKrFNTqu30poPuSzNEYBcuIH0p3zKXWl+8AMXS
DqlRgBUPfe1GjnzTyh/ZD0YlEXEZ2C3gbCAls5O0QzB4HHvKfxTovgs3eBYNQUIQ
koivEKhp7CDKCsZ8gd/L5BFdUP32SLaMVwLr/qhiloz3lkxm498LbMzn4f5PQGQk
vMylvG6P5x7LBJ18Z/H60drdbkQhaXNznlsG8R8lPHYZOKfa4QD8GErzyqOZmvpL
kLtAELN12HpyWUeG9o/yYOU486TQ/42r8cJ2TuEg1lv5DraIKAuSDXoGuIhcDWn7
7CNmYTECgYEA3yD+rGKGJ7j6sJhoac2CpRISmQEkihofECLP2BCgHb9I+euSRc5Y
6JDutQ+TeuBf+NqS0L05Y8SF5Riy4KfE8DGom8v5PWUv4BrTkDns2VTshElA1SBa
cgZZUYloTKy6EB66QxNT7xDnQsYIqhb1hXNwgUTp9rr5fqGxjoXrPHUCgYEA2ZbH
gaE5q/tXRQh0BEb0/GvBfPMkctMLzkxFUcOzPdRwUdpyX89073rPT10JpuUHBlUi
eutt3wnDFU3nGy3P5UhKyw2vrwNswPJu+ni0Syi2JPnUVTWVkudr+wZPMr6wVTAy
133UJgWr+plu9LI3lZ3nBCHRhdLbTC507tfFS78CgYBjYmftUqkcslj/JbOEROSH
MAiWnBqxZLcnUcowHB+lgFk58IKjkyio1j1s6nYvSheVWY4BafdRB+z3wUuTo0am
Eghe9LicbyCm+mv3lsV3fEspFRPKmnGOzmMkXUbWuCzcF0Oxsr81AdtwM5MSZ82O
Vn/rJE3t9xRAIjdbGy1PLQKBgA6J55y+xBa8vZEMRow+nYH8RTpvGKFffqtzJzKW
a/SWrEab3QaP2xVhVFbONaXkKbr/l0U1U+sSQOm8gdOsFPcSBIVazcFY7jxaNpYf
2JQpDTqdQtXKtcrSEcH9Iu+WFDws80i4zKMZv+sHs4VAHzytB1GcXN6fPy3w8LlA
y5sLAoGAfVB9hdwE1M15Cu9X/DGCH3FqD/6Sr8xhb53zk5XCAvnBsbRpZwycH1X7
vcT2nczbNlsDR6kb0Mhaq46E29sdQ/XYuNHjSVSqNJ8ejmT1b3KXGQaKEvMJdDBj
g7KuNtGVfViqbvA2x5PpTrYU2IuXtXxh7yntAceuzFCvcb6GSbs=
-----END RSA PRIVATE KEY-----";

    public CipherService()
    {
        _rsaMasterKey = RSA.Create();
        _rsaMasterKey.ImportFromPem(privateKeyPem);
    }

    public (byte[] cipherText, byte[] encryptedKey, byte[] iv, byte[] tag) EncryptFile(Stream fileStream)
    {
        byte[] fileKey = RandomNumberGenerator.GetBytes(32);
        byte[] iv = RandomNumberGenerator.GetBytes(12);

        using var aes = new AesGcm(fileKey, tagSizeInBytes: 16);
        using var ms = new MemoryStream();
        byte[] plainBytes = ReadAllBytes(fileStream);
        byte[] cipherText = new byte[plainBytes.Length];
        byte[] tag = new byte[16];

        aes.Encrypt(iv, plainBytes, cipherText, tag);

        byte[] encryptedKey = _rsaMasterKey.Encrypt(fileKey, RSAEncryptionPadding.OaepSHA256);

        return (cipherText, encryptedKey, iv, tag);
    }

    public byte[] DecryptFile(byte[] cipherText, byte[] encryptedKey, byte[] iv, byte[] tag)
    {
        Console.WriteLine("EncryptedKey length: " + encryptedKey.Length);
        Console.WriteLine("Expected length: " + (_rsaMasterKey.KeySize / 8));

        byte[] fileKey = _rsaMasterKey.Decrypt(encryptedKey, RSAEncryptionPadding.OaepSHA256);

        using var aes = new AesGcm(fileKey, tagSizeInBytes: 16);
        byte[] plainBytes = new byte[cipherText.Length];
        aes.Decrypt(iv, cipherText, tag, plainBytes);

        return plainBytes;
    }

    private static byte[] ReadAllBytes(Stream stream)
    {
        using var ms = new MemoryStream();
        stream.CopyTo(ms);
        return ms.ToArray();
    }
}
