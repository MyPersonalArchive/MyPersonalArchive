using System.Text.Json;
using Backend.Core.Infrastructure;
using Backend.Mpa.Core.Store;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Mpa.Core.Services;

[RegisterService(ServiceLifetime.Scoped)]
public class ArchiveItemQueryService
{
	private readonly ArchiveObjectStore _archiveObjectStore;
	private readonly BlobQueryService _blobQueryService;

	public ArchiveItemQueryService(ArchiveObjectStore archiveObjectStore, BlobQueryService blobQueryService)
	{
		_archiveObjectStore = archiveObjectStore;
		_blobQueryService = blobQueryService;
	}


	public async Task<ArchiveItem?> GetArchiveItem(Guid id)
	{
		using var archiveItemStream = await _archiveObjectStore.GetObject(id, "json");
		if (archiveItemStream == null)
		{
			return null;
		}
		var archiveItem = JsonSerializer.Deserialize<ArchiveItem>(archiveItemStream, JsonSerializerOptions.Web) ?? throw new Exception("Failed to deserialize ArchiveItem");

		return archiveItem;
	}


	public async Task<IEnumerable<ArchiveItem>> ListArchiveItems()
	{
		var archiveItemGuids = await _archiveObjectStore.ListObjectIds();
		var archiveItemStreams = (
			await Task.WhenAll(archiveItemGuids.Select(async objectId => await _archiveObjectStore.GetObject(objectId, "json")))
		).ToList();
		var archiveItems = archiveItemStreams
			.Where(stream => stream != null)
			.Select(stream => stream!)
			.Select(stream => JsonSerializer.Deserialize<ArchiveItem>(stream, JsonSerializerOptions.Web))
			.Where(item => item != null)
			.Select(item => item!)
			.ToList();

		archiveItemStreams.ForEach(stream => stream?.Dispose());

		return archiveItems;
	}


	public async Task<IEnumerable<ArchiveItem.BlobDisplayInfo>> GetBlobDisplayInfos(IEnumerable<Guid> connectedBlobIds)
	{
		var blobEntities = await _blobQueryService.GetBlobEntities(connectedBlobIds);
		return blobEntities
			.Where(blobEntity => blobEntity != null)
			.Select(blobEntity => new ArchiveItem.BlobDisplayInfo
			{
				Id = blobEntity!.Id,
				MimeType = blobEntity.MimeType,
				NumberOfPages = blobEntity.TypeSpecificMetadata is PdfMetadata pdfMetadata ? pdfMetadata.PageCount : 0
			});
	}
}
