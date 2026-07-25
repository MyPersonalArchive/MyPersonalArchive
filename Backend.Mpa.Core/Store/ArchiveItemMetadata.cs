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


	public class BlobDisplayInfo
	{
		public required Guid Id { get; set; }
		public required string MimeType { get; set; }
		public required int NumberOfPages { get; set; }
	}
}
