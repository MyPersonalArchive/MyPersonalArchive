using System.Text.Json.Nodes;
using Backend.Core.Infrastructure;
using Backend.Core.Services;
using Backend.Mpa.Core.Store;
using Backend.Mpa.DbModel.Database;
using Backend.Mpa.DbModel.Database.EntityModels;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Mpa.Core.Services;

[RegisterService(ServiceLifetime.Scoped)]
public class ArchiveItemCommandService
{
	private readonly ArchiveItemPublicationService _archiveItemPublicationService;
	private readonly MpaDbContext _dbContext;
	private readonly BlobQueryService _blobQueryService;
	private readonly BlobCommandService _blobCommandService;
	private readonly BlobPublicationService _blobPublicationService;

	private readonly IAmbientDataResolver _resolver;
	
	public ArchiveItemCommandService(ArchiveItemPublicationService archiveItemPublicationService, MpaDbContext dbContext, BlobQueryService blobQueryService, BlobCommandService blobCommandService, BlobPublicationService blobPublicationService, IAmbientDataResolver resolver)
	{
		_archiveItemPublicationService = archiveItemPublicationService;
		_dbContext = dbContext;
		_blobQueryService = blobQueryService;
		_blobCommandService = blobCommandService;
		_blobPublicationService = blobPublicationService;
		_resolver = resolver;
	}


	public async Task<ArchiveItem> CreateArchiveItem(string title,
													 IEnumerable<string> tags,
													 JsonObject? metadata,
													 IEnumerable<Guid> blobIds,
													 IEnumerable<(Stream stream, string fileName, string contentType)> uploadedBlobs)
	{
		var existingBlobEntities = await _blobQueryService.GetBlobEntities(blobIds);

		var newBlobGuids = await _blobCommandService.UploadBlobs(uploadedBlobs);
		var newBlobEntities = await _blobQueryService.GetBlobEntities(newBlobGuids);

		ICollection<BlobMetadata> connectedBlobEntities = [.. existingBlobEntities, .. newBlobEntities];

		var newArchiveItem = new ArchiveItem
		{
			Title = title,
			CreatedByUsername = _resolver.GetCurrentUsername() ?? throw new Exception("Missing NameIdentifier claim"),
			CreatedAt = DateTimeOffset.Now,
			Blobs = connectedBlobEntities.Select(blobMetadata => new Blob
			{
				Id = blobMetadata.Id,
				MimeType = blobMetadata.MimeType,
				PageCount = blobMetadata.TypeSpecificMetadata is PdfMetadata pdfMetadata ? pdfMetadata.PageCount : 1
			}).ToList(),
			Tags = Tags.Ensure(_dbContext, tags),
			Metadata = metadata ?? new JsonObject(),
			LastUpdated = DateTimeOffset.Now
		};

		_dbContext.ArchiveItems.Add(newArchiveItem);
		await _dbContext.SaveChangesAsync();

		await _archiveItemPublicationService.PublishArchiveItemsAddedMessage([newArchiveItem]);
		await _blobPublicationService.PublishBlobsUpdatedMessage(connectedBlobEntities);

		return newArchiveItem;
	}


	public async Task<ArchiveItem?> UpdateArchiveItem(Guid archiveItemId,
													  string title,
													  IEnumerable<string> tags,
													  JsonObject? metadata,
													  DateTimeOffset? documentDate,
													  IEnumerable<Guid> blobIds,
													  IEnumerable<(Stream stream, string fileName, string contentType)> uploadedBlobs)
	{
		var archiveItem = await _dbContext.ArchiveItems
			.Include(item => item.Blobs)
			.Include(item => item.Tags)
			.SingleOrDefaultAsync(item => item.Id == archiveItemId);

		if (archiveItem == null)
		{
			return null;
		}

		var addedBlobIds = blobIds.Except(archiveItem.Blobs!.Select(blob => blob.Id));
		foreach(var blobEntity in await _blobQueryService.GetBlobEntities(addedBlobIds))
		{
			var dbBlob = new Blob
			{
				Id = blobEntity.Id,
				MimeType = blobEntity.MimeType,
				PageCount = blobEntity.TypeSpecificMetadata is PdfMetadata pdfMetadata ? pdfMetadata.PageCount : 1
			};
			archiveItem.Blobs!.Add(dbBlob);
		}

		var removedBlobIds = archiveItem.Blobs!.Select(blob => blob.Id).Except(blobIds).ToList();
		foreach (var blobId in removedBlobIds)
		{
			var blobEntity = archiveItem.Blobs!.Single(blob => blob.Id == blobId);
			_dbContext.Blobs.Remove(blobEntity);
		}

		var uploadedBlobEntities = await _blobCommandService.UploadBlobs(uploadedBlobs);
		foreach (var blobEntity in await _blobQueryService.GetBlobEntities(uploadedBlobEntities))
		{
			var dbBlob = new Blob
			{
				Id = blobEntity.Id,
				MimeType = blobEntity.MimeType,
				PageCount = blobEntity.TypeSpecificMetadata is PdfMetadata pdfMetadata ? pdfMetadata.PageCount : 1
			};
			archiveItem.Blobs!.Add(dbBlob);
		}

		archiveItem.Title = title;
		archiveItem.Tags = Tags.Ensure(_dbContext, tags);
		archiveItem.Metadata = metadata ?? new JsonObject();
		archiveItem.DocumentDate = documentDate;
		archiveItem.LastUpdated = DateTimeOffset.Now;


		await _dbContext.SaveChangesAsync();

		await _archiveItemPublicationService.PublishArchiveItemsUpdatedMessage([archiveItem]);

		await _blobPublicationService.PublishBlobsUpdatedMessage([.. addedBlobIds, .. removedBlobIds]);
		await _blobPublicationService.PublishBlobsAddedMessage(uploadedBlobEntities);

		return archiveItem;
	}


	public async Task<bool> DeleteArchiveItem(Guid id)
	{
		var archiveItem = await _dbContext.ArchiveItems
			.Include(archiveItem => archiveItem.Blobs)
			.Include(archiveItem => archiveItem.Tags)
				.ThenInclude(tag => tag.ArchiveItems)
				.SingleOrDefaultAsync(x => x.Id == id);

		if (archiveItem == null)
		{
			return false;
		}

		if (archiveItem.Blobs != null)
		{
			var blobGuids = archiveItem.Blobs.Select(blob => blob.Id);
			await _blobCommandService.DeleteBlobs(blobGuids);
			_dbContext.Blobs.RemoveRange(archiveItem.Blobs);
		}

		var removedTags = archiveItem.Tags.Where(tag => tag.ArchiveItems != null && tag.ArchiveItems.Count == 1 && tag.ArchiveItems.Contains(archiveItem));
		foreach (var tag in removedTags)
		{
			_dbContext.Tags.Remove(tag);
		}

		_dbContext.ArchiveItems.Remove(archiveItem);
		await _dbContext.SaveChangesAsync();

		await _archiveItemPublicationService.PublishArchiveItemsDeletedMessage([archiveItem]);

		return true;
	}
}