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


	public async Task<ArchiveItemModel?> GetArchiveItem(Guid id)
	{
		using var archiveItemStream = await _archiveObjectStore.GetObject(id, "json");
		if (archiveItemStream == null)
		{
			return null;
		}
		var archiveItem = JsonSerializer.Deserialize<ArchiveItemModel>(archiveItemStream, JsonSerializerOptions.Web) ?? throw new Exception("Failed to deserialize ArchiveItem");

		return archiveItem;
	}


	public async Task<IEnumerable<ArchiveItemModel>> ListArchiveItems()
	{
		var archiveItemGuids = await _archiveObjectStore.ListObjectIds();
		var archiveItemStreams = (
			await Task.WhenAll(archiveItemGuids.Select(async objectId => await _archiveObjectStore.GetObject(objectId, "json")))
		).ToList();
		var archiveItems = archiveItemStreams
			.Where(stream => stream != null)
			.Select(stream => stream!)
			.Select(stream => JsonSerializer.Deserialize<ArchiveItemModel>(stream, JsonSerializerOptions.Web))
			.Where(item => item != null)
			.Select(item => item!)
			.ToList();

		archiveItemStreams.ForEach(stream => stream?.Dispose());

		return archiveItems;
	}


	public async Task<IEnumerable<ArchiveItemModel.BlobDisplayInfo>> GetBlobDisplayInfos(IEnumerable<Guid> connectedBlobIds)
	{
		var blobs = await _blobQueryService.GetBlobs(connectedBlobIds);
		return blobs
			.Where(blob => blob != null)
			.Select(blob => new ArchiveItemModel.BlobDisplayInfo
			{
				Id = blob!.Id,
				MimeType = blob.MimeType,
				NumberOfPages = blob.TypeSpecificMetadata is PdfMetadata pdfMetadata ? pdfMetadata.PageCount : 0
			});
	}
}
