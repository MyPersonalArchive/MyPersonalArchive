using System.Text.Json.Nodes;

namespace Backend.Mpa.Core.Store;

public class ArchiveItem
{
	public required Guid Id { get; set; }

	public required string Title { get; set; }

	public required IEnumerable<string> Tags { get; set; }
	public DateTimeOffset? DocumentDate { get; set; }
	public required DateTimeOffset CreatedAt { get; set; }
	public required string CreatedByUsername { get; set; }
	public required DateTimeOffset LastUpdated { get; set; }
	public required JsonObject Metadata { get; set; }
	public required IEnumerable<BlobDisplayInfo> BlobDisplayInfos { get; set; }

	public class BlobDisplayInfo
	{
		public required Guid Id { get; set; }
		public required string MimeType { get; set; }
		public required int NumberOfPages { get; set; }
	}

}
