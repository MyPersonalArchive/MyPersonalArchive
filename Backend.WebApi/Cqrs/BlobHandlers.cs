using Backend.Core.Cqrs.Infrastructure;
using Backend.Core.Providers.Store;
using Backend.DbModel.Database;
using Backend.DbModel.Database.EntityModels;
using Backend.WebApi.Cqrs.Infrastructure;
using Backend.WebApi.Services;
using Microsoft.EntityFrameworkCore;

namespace Backend.WebApi.Cqrs;


[RequireAllowedTenantId]
public class GetBlob : IQuery<GetBlob, GetBlob.Response>
{
	public int Id { get; set; }

	public class Response
	{
		public int Id { get; set; }
		public string? FileName { get; set; }
		public long FileSize { get; set; }
		public DateTimeOffset UploadedAt { get; set; }
		public required string UploadedByUser { get; set; }
		public int PageCount { get; set; }
		public string? MimeType { get; set; }
		public bool IsAllocated { get; internal set; }
	}
}


[RequireAllowedTenantId]
public class ListBlobs : IQuery<ListBlobs, IEnumerable<ListBlobs.Response>>
{
	// no params to list all blobs

	public class Response
	{
		public int Id { get; set; }
		public string? FileName { get; set; }
		public long FileSize { get; set; }
		public DateTimeOffset UploadedAt { get; set; }
		public required string UploadedByUser { get; set; }
		public int PageCount { get; set; }
		public string? MimeType { get; set; }
		public bool IsAllocated { get; internal set; }
	}
}


public class DeleteBlobs : ICommand<DeleteBlobs>
{
	public required int[] BlobIds { get; set; }
}


public class BlobHandlers :
	IAsyncQueryHandler<GetBlob, GetBlob.Response>,
	IAsyncQueryHandler<ListBlobs, IEnumerable<ListBlobs.Response>>,
	IAsyncCommandHandler<DeleteBlobs>
{
	private readonly BlobService _blobService;
	private readonly MpaDbContext _dbContext;
	private readonly IObjectStore _objectStore;

	public BlobHandlers(BlobService blobService, MpaDbContext dbContext, IObjectStore objectStore)
	{
		_blobService = blobService;
		_dbContext = dbContext;
		_objectStore = objectStore;
	}


	public async Task<GetBlob.Response> Handle(GetBlob query)
	{
		var blob = await _dbContext.Blobs
			.Include(blob => blob.UploadedBy)
			.Select(blob => new GetBlob.Response
			{
				Id = blob.Id,
				FileName = blob.OriginalFilename,
				FileSize = blob.FileSize,
				PageCount = blob.PageCount,
				UploadedAt = blob.UploadedAt,
				UploadedByUser = blob.UploadedBy!.Fullname,
				MimeType = blob.MimeType,
				IsAllocated = blob.ArchiveItem != null
			})
			.SingleOrDefaultAsync(blob => blob.Id == query.Id);

		if (blob == null)
		{
			throw new HttpNotFoundException($"Blob with id {query.Id} not found");
		}

		return blob;
	}


	public async Task<IEnumerable<ListBlobs.Response>> Handle(ListBlobs query)
	{
		var total = await _dbContext.Blobs
					.Where(blob => blob.ArchiveItem == null)
					.CountAsync();

		var blobs = (await _dbContext.Blobs
			.Include(blob => blob.UploadedBy)
			.Select(blob => new ListBlobs.Response
			{
				Id = blob.Id,
				FileName = blob.OriginalFilename,
				FileSize = blob.FileSize,
				PageCount = blob.PageCount,
				UploadedAt = blob.UploadedAt,
				UploadedByUser = blob.UploadedBy!.Fullname,
				MimeType = blob.MimeType,
				IsAllocated = blob.ArchiveItem != null
			})
			.ToListAsync()) // Cannot orderBy dateTimeOffset without ToListing first
			.OrderByDescending(blob => blob.UploadedAt)
			.ToList();

		return blobs;
	}

	public async Task Handle(DeleteBlobs command)
	{
		var blobs = await _dbContext.Blobs.Where(x => command.BlobIds.Contains(x.Id)).ToListAsync();
		if (!blobs.Any())
		{
			throw new HttpNotFoundException("Blobs not found");
		}

		foreach (var blob in blobs)
		{
			var filename = blob.PathInStore.Split('/').Last();
			var objectId = Guid.Parse(Path.GetFileNameWithoutExtension(filename));

			await _objectStore.DeleteObject(objectId);
		}
		_dbContext.Blobs.RemoveRange(blobs);

		await _dbContext.SaveChangesAsync();

		await _blobService.PublishBlobsDeletedMessage(blobs);
	}
}