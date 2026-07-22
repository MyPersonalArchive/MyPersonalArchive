using Backend.Core.Cqrs.Infrastructure;
using Backend.Mpa.Core.Services;
using Backend.Mpa.Core.Store;

namespace Backend.Mpa.Core.Cqrs;


[RequireAllowedTenantId]
public class GetBlob : IQuery<GetBlob, GetBlob.Response>
{
	public Guid Id { get; set; }

	public class Response
	{
		public Guid Id { get; set; }
		public string? FileName { get; set; }
		public long FileSize { get; set; }
		public DateTimeOffset UploadedAt { get; set; }
		public required string UploadedByUser { get; set; }
		public int PageCount { get; set; }
		public required string MimeType { get; set; }
	}
}


[RequireAllowedTenantId]
public class ListBlobs : IQuery<ListBlobs, IEnumerable<ListBlobs.Response>>
{
	// no params to list all blobs

	public class Response
	{
		public Guid Id { get; set; }
		public string? FileName { get; set; }
		public long FileSize { get; set; }
		public DateTimeOffset UploadedAt { get; set; }
		public required string UploadedByUser { get; set; }
		public int PageCount { get; set; }
		public required string MimeType { get; set; }
	}
}


[RequireAllowedTenantId]
public class DeleteBlobs : ICommand<DeleteBlobs>
{
	public required Guid[] BlobIds { get; set; }
}


public class BlobHandlers :
	IAsyncQueryHandler<GetBlob, GetBlob.Response>,
	IAsyncQueryHandler<ListBlobs, IEnumerable<ListBlobs.Response>>,
	IAsyncCommandHandler<DeleteBlobs>
{
	private readonly BlobQueryService _blobQueryService;
	private readonly BlobCommandService _blobCommandService;

	public BlobHandlers(BlobQueryService blobQueryService, BlobCommandService blobCommandService)
	{
		_blobQueryService = blobQueryService;
		_blobCommandService = blobCommandService;
	}


	public async Task<GetBlob.Response> Handle(GetBlob query)
	{
		var blob = await _blobQueryService.GetBlobEntity(query.Id);
		if (blob == null)
		{
			throw new HttpNotFoundException($"Blob with id {query.Id} not found");
		}

		return new GetBlob.Response
		{
			Id = blob.Id,
			FileName = blob.OriginalFilename,
			FileSize = blob.Size,
			PageCount = blob.TypeSpecificMetadata is PdfMetadata pdfMetadata ? pdfMetadata.PageCount : 1,
			UploadedAt = blob.UploadedAt,
			UploadedByUser = blob.UploadedBy,
			MimeType = blob.MimeType
		};
	}


	public async Task<IEnumerable<ListBlobs.Response>> Handle(ListBlobs query)
	{
		var blobEntities = await _blobQueryService.ListBlobEntities();
		return blobEntities
			.OrderByDescending(blob => blob.UploadedAt)
			.Select(blob => new ListBlobs.Response
			{
				Id = blob.Id,
				FileName = blob.OriginalFilename,
				FileSize = blob.Size,
				PageCount = blob.TypeSpecificMetadata is PdfMetadata pdfMetadata ? pdfMetadata.PageCount : 1,
				UploadedAt = blob.UploadedAt,
				UploadedByUser = blob.UploadedBy,
				MimeType = blob.MimeType
			});
	}

	public async Task Handle(DeleteBlobs command)
	{
		await _blobCommandService.DeleteBlobs(command.BlobIds);
	}
}