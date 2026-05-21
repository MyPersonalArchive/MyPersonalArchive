namespace Backend.Core.Providers;

//TODO: Consider using a dictionary of StringEnums for metadata
public class FileMetadata
{
	public DateTimeOffset UploadedAt { get; set; }
	public required string UploadedBy { get; set; }
	public required string OriginalFilename { get; set; }
	public required string MimeType { get; set; }
	public required long Size { get; set; }
	public required string Hash { get; set; }
}