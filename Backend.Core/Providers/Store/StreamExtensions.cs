using System.Security.Cryptography;

public static class StreamExtensions
{
	extension(Stream stream)
	{
		public byte[] ComputeSha256Hash()
		{
			stream.Seek(0, SeekOrigin.Begin);
			using var sha256Hash = SHA256.Create();
			return sha256Hash.ComputeHash(stream);
		}
	}
}