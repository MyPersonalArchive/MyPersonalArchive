using System.Buffers.Text;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using NetVips;
using Microsoft.VisualBasic;

namespace Backend.Core.Providers;

//If we find a common implementation for storage types this can be IStorageProvider which 
//can handle cloud, local etc... Currently, we only have local file storage
public interface IFileStorageProvider
{
    Task<string> StoreFile(string fileName, string data);
    Stream GetFile(string filePath, out FileMetadata metadata);
    Stream GetPreview(string filePath, int maxX, int maxY, int pageNo, out FileMetadata metadata);
    void DeleteFile(string fileName);
}

public class FileStorageProvider : IFileStorageProvider
{
    private const string MetadataExtension = ".metadata";

    private readonly string _baseFolder;
    private readonly AmbientDataResolver _resolver;

    public FileStorageProvider(IOptions<AppConfig> config, AmbientDataResolver resolver)
    {
        _resolver = resolver;
        _baseFolder = Path.Combine(config.Value.BlobFolder, resolver.GetCurrentTenantId().ToString());
    }


    public async Task<string> StoreFile(Stream stream, FileMetadata metadata)
    {
        //TODO:
        //TODO: If PDF, store the number of pages in the metadata
        throw new NotImplementedException();
    }


    public async Task<string> StoreFile(string fileName, string data)
    {
        //TODO: If PDF, store the number of pages in the metadata
        var username = _resolver.GetCurrentUsername() ?? throw new Exception("Missing NameIdentifier claim");

        if (string.IsNullOrEmpty(fileName) || string.IsNullOrEmpty(data)) return null;

        var uniqueFileId = Guid.NewGuid().ToString();

        var folderPath = GetFolderPath(uniqueFileId);
        if (!Directory.Exists(folderPath))
        {
            Directory.CreateDirectory(folderPath);
        }

        var filePath = Path.Combine(folderPath, uniqueFileId) + Path.GetExtension(fileName);
        var dataBytes = StripBase64AndConvertToByteArray(data);

        await File.WriteAllTextAsync(Path.ChangeExtension(filePath, MetadataExtension), JsonConvert.SerializeObject(new FileMetadata
        {
            MimeType = GetMimeTypeFromBase64(data),
            Size = dataBytes.Length,
            OriginalFilename = fileName,
            Hash = ComputeSha256Hash(data),
            UploadedAt = DateTimeOffset.Now,
            UploadedBy = username
        }));
        await File.WriteAllBytesAsync(filePath, dataBytes);

        return filePath;
    }



    public Stream GetFile(string filePath, out FileMetadata metadata)
    {
        var metadataPath = Path.ChangeExtension(filePath, MetadataExtension);

        metadata = JsonConvert.DeserializeObject<FileMetadata>(File.ReadAllText(metadataPath));

        var stream = File.Open(filePath, FileMode.Open, FileAccess.Read, FileShare.Read); //.ReadAllBytesAsync(filePath);
        return stream;
    }


    public Stream GetPreview(string filePath, int maxX, int maxY, int pageNo, out FileMetadata metadata)
    {
        var originalStream = GetFile(filePath, out metadata);

        var previewStream = new MemoryStream();
        //TODO: if PDF, use Image.PdfLoadStream(originalStream, pageNo)
        Image.NewFromStream(originalStream).ThumbnailImage(maxX, maxY).WriteToStream(previewStream, ".jpg");
        previewStream.Position = 0;
        return previewStream;
    }


    public void DeleteFile(string fileName)
    {
        var filePath = Path.Combine(GetFolderPath(Path.GetFileNameWithoutExtension(fileName)), fileName);
        var metadataPath = Path.ChangeExtension(filePath, MetadataExtension);

        if (File.Exists(metadataPath)) File.Delete(metadataPath);

        if (File.Exists(filePath)) File.Delete(filePath);
    }

    private string GetFolderPath(string uniqueFileName) => Path.Combine(_baseFolder, uniqueFileName[..2], uniqueFileName[..4], uniqueFileName[..6]);

    private string GetMimeTypeFromBase64(string value) => Regex.Split(value, @"(?<=[,])")[0].Trim(); //Because ',' is an invalid base64 character we can safely split on this

    private byte[] StripBase64AndConvertToByteArray(string value)
    {
        var temp = value;
        var split = value.Split("base64,");
        if (split.Length > 0)
        {
            temp = split[1];
        }

        return Base64.IsValid(temp) ? Convert.FromBase64String(temp) : Encoding.UTF8.GetBytes(temp);
    }

    private string ComputeSha256Hash(string input)
    {
        using var sha256Hash = SHA256.Create();
        var bytes = sha256Hash.ComputeHash(Encoding.UTF8.GetBytes(input));

        return Convert.ToHexString(bytes);
    }
}


public class FileMetadata
{
    public DateTimeOffset UploadedAt { get; set; }
    public string UploadedBy { get; set; }
    public string OriginalFilename { get; set; }
    public string MimeType { get; set; }
    public long Size { get; set; }
    public string Hash { get; set; }
}