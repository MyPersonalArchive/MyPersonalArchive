using System.Text.Json.Serialization;

namespace Backend.Mpa.Core.Store;

public class BlobMetadata
{
	public required Guid Id { get; set; }
	public required string OriginalFilename { get; set; }
	public required string MimeType { get; set; }
	public required long Size { get; set; }
	public required string Hash { get; set; }
	public required ITypeSpecificMetadata? TypeSpecificMetadata { get; set; }
	public required DateTimeOffset UploadedAt { get; set; }
	public required string UploadedBy { get; set; }
}

[JsonPolymorphic(TypeDiscriminatorPropertyName = "$type")]
[JsonDerivedType(typeof(PdfMetadata), nameof(PdfMetadata))]
[JsonDerivedType(typeof(RasterImageMetadata), nameof(RasterImageMetadata))]
public interface ITypeSpecificMetadata
{
	// Marker interface for type-specific metadata
}

public class PdfMetadata : ITypeSpecificMetadata
{
	public required int PageCount { get; set; }
}

public class RasterImageMetadata : ITypeSpecificMetadata
{
	public required int Width { get; set; }
	public required int Height { get; set; }
}