using System.Text.Json.Nodes;
using Backend.DbModel.Database.EntityModels;


// TODO: Should we use a FilterModel json field instead of specific fields for Title, MetadataTypes and Tags?
public class StoredFilter : TenantEntity
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Title { get; set; }
    public string[]? Tags { get; set; }
    public string[]? MetadataTypes { get; set; }

	// public int Order { get; set; }
	// public string FilterType { get; set; } // e.g. for archive items, for blobs, etc. (for backing up/syncing to a destination?)
	// public JsonObject? FilterDefinition { get; set; }
}