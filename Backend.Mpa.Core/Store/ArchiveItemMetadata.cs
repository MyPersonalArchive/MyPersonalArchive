using System.Text.Json.Nodes;

namespace Backend.Mpa.Core.Store;


public class ArchiveItemMetadata
{
	public Guid Id { get; set; }

	public required string Title { get; set; }

	public DateTimeOffset? DocumentDate { get; set; }
	public required IEnumerable<string> Tags { get; set; }
	public required DateTimeOffset CreatedAt { get; set; }
	public required string CreatedBy { get; set; }
	public DateTimeOffset LastUpdatedAt { get; set; }
	public required string LastUpdatedBy { get; set; }

	public IEnumerable<BlobDisplayInfo> Blobs { get; set; } = [];

	public required JsonObject Metadata { get; set; }
	// public ICollection<ICategorySpecificMetadata> Metadata { get; set; } = [];


	public class BlobDisplayInfo
	{
		public required Guid Id { get; set; }
		public required string MimeType { get; set; }
		public required int NumberOfPages { get; set; }
	}
}


// [JsonPolymorphic(TypeDiscriminatorPropertyName = "$type")]
// [JsonDerivedType(typeof(ReceiptMetadata), nameof(ReceiptMetadata))]
// // [JsonDerivedType(typeof(RasterImageMetadata), nameof(RasterImageMetadata))]
// public interface ICategorySpecificMetadata
// {
// 	// Marker interface for category-specific metadata
// }


// public class ReceiptMetadata : ICategorySpecificMetadata
// {
// 	public required string Vendor { get; set; }
// 	public required DateTimeOffset PurchaseDate { get; set; }
// 	public required decimal Amount { get; set; }
// 	public required string Currency { get; set; }

// 	public required string Warranty { get; set; }
// }