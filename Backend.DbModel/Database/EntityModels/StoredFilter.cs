using Backend.DbModel.Database.EntityModels;


// TODO: Should we use a FilterModel json field instead of specific fields for Title, MetadataTypes and Tags?
public class StoredFilter : TenantEntity
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Title { get; set; }
    public string[]? Tags { get; set; }
    public string[]? MetadataTypes { get; set; }
}