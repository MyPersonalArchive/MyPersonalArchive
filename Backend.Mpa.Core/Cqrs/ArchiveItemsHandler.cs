
using System.Text.Json.Nodes;
using Backend.Core.Cqrs.Infrastructure;
using Backend.Mpa.Core.Services;
using Backend.Mpa.Core.Store;

namespace Backend.Mpa.Core.Cqrs;


[RequireAllowedTenantId]
public class GetArchiveItem : IQuery<GetArchiveItem, GetArchiveItem.Response>
{
	public Guid Id { get; set; }

	public class Response
	{
		public Guid Id { get; set; }
		public required string Title { get; set; }
		public required IEnumerable<string> Tags { get; set; }
		public DateTimeOffset? DocumentDate { get; set; }
		public required DateTimeOffset CreatedAt { get; set; }
		public required JsonObject Metadata { get; set; }
		public required IEnumerable<BlobDisplayInfo> BlobDisplayInfos { get; set; }

		public class BlobDisplayInfo
		{
			public required Guid Id { get; set; }
			public required string? MimeType { get; set; }
			public required int NumberOfPages { get; set; }
		}
	}
}


[RequireAllowedTenantId]
public class ListArchiveItems : IQuery<ListArchiveItems, IEnumerable<ListArchiveItems.Response>>
{
	public class Response
	{
		public Guid Id { get; set; }
		public required string Title { get; set; }
		public required IEnumerable<string> Tags { get; set; }
		public DateTimeOffset? DocumentDate { get; set; }
		public required DateTimeOffset CreatedAt { get; set; }
		public required JsonObject Metadata { get; set; }
		public required IEnumerable<BlobDisplayInfo> BlobDisplayInfos { get; set; }

		public class BlobDisplayInfo
		{
			public required Guid Id { get; set; }
			public required string? MimeType { get; set; }
			public required int NumberOfPages { get; set; }
		}
	}
}



// [RequireAllowedTenantId]
// public class CreateArchiveItem : ICommand<CreateArchiveItem>
// {
// 	public required string Title { get; set; }
// 	public required List<string> Tags { get; set; }
// 	public required JsonObject Metadata { get; set; }
// 	public required List<int> BlobIds { get; set; }
// }


[RequireAllowedTenantId]
public class DeleteArchiveItem : ICommand<DeleteArchiveItem>
{
	public Guid Id { get; set; }
}


public class ArchiveItemsHandler :
	IAsyncQueryHandler<GetArchiveItem, GetArchiveItem.Response>,
	IAsyncQueryHandler<ListArchiveItems, IEnumerable<ListArchiveItems.Response>>,
	// IAsyncCommandHandler<CreateArchiveItem>,
	IAsyncCommandHandler<DeleteArchiveItem>
{
	private readonly ArchiveItemService _archiveItemService;
	private readonly BlobService _blobService;

	public ArchiveItemsHandler(ArchiveItemService archiveItemService, BlobService blobService)
	{
		_archiveItemService = archiveItemService;
		_blobService = blobService;
	}

	public async Task<GetArchiveItem.Response> Handle(GetArchiveItem query)
	{
		var archiveItem = await _archiveItemQueryService.GetArchiveItem(query.Id);
		if (archiveItem == null)
		{
			throw new HttpNotFoundException();
		}

		return new GetArchiveItem.Response
		{
			Id = archiveItem.Id,
			Title = archiveItem.Title,
			Tags = archiveItem.Tags,
			DocumentDate = archiveItem.DocumentDate,
			CreatedAt = archiveItem.CreatedAt,
			Metadata = archiveItem.Metadata,
			BlobDisplayInfos = archiveItem.BlobDisplayInfos.Select(blobDisplayInfo => new GetArchiveItem.Response.BlobDisplayInfo
			{
				Id = blobDisplayInfo.Id,
				MimeType = blobDisplayInfo.MimeType,
				NumberOfPages = blobDisplayInfo.NumberOfPages
			})
		};
	}


	private async Task<IEnumerable<GetArchiveItem.Response.BlobDisplayInfo>> GetDisplayInfos(IEnumerable<Guid> blobIds)
	{
		var tasks = blobIds
			.Select(async blobId => await _blobService.GetBlobEntity(blobId));

		var blobMetadatas = await Task.WhenAll(tasks);
		return blobMetadatas
			.Where(blobMetadata => blobMetadata != null)
			.Select(blobMetadata =>
			{
				return new GetArchiveItem.Response.BlobDisplayInfo
				{
					Id = blobMetadata!.Id,
					MimeType = blobMetadata.MimeType,
					NumberOfPages = blobMetadata.TypeSpecificMetadata is PdfMetadata pdfMetadata ? pdfMetadata.PageCount : 1
				};
			});
	}

	public async Task<IEnumerable<ListArchiveItems.Response>> Handle(ListArchiveItems query)
	{
		var archiveItems = await _archiveItemQueryService.ListArchiveItems();
		return archiveItems
			.Select(archiveItem => new ListArchiveItems.Response
			{
				Id = archiveItem.Id,
				Title = archiveItem.Title,
				Tags = archiveItem.Tags,
				DocumentDate = archiveItem.DocumentDate,
				CreatedAt = archiveItem.CreatedAt,
				Metadata = archiveItem.Metadata,
				BlobDisplayInfos = archiveItem.BlobDisplayInfos.Select(blobDisplayInfo => new ListArchiveItems.Response.BlobDisplayInfo
				{
					Id = blobDisplayInfo.Id,
					MimeType = blobDisplayInfo.MimeType,
					NumberOfPages = blobDisplayInfo.NumberOfPages
				})
			})
			// .OrderBy(archItem => archItem.Title == null ? (int?)null : archItem.Title.IndexOf(titleFilter, StringComparison.InvariantCultureIgnoreCase))
			// .ThenBy(archItem => archItem.Title == null ? null : archItem.Title, StringComparer.InvariantCultureIgnoreCase);
			.OrderBy(archItem => archItem.Title == null ? null : archItem.Title, StringComparer.InvariantCultureIgnoreCase);
	}


	// public async Task Handle(CreateArchiveItem command)
	// {
	// 	var archiveItem = await _archiveItemService.CreateArchiveItem(command.Title, command.Tags, command.Metadata, command.BlobIds);

	// 	//TODO: Should this return the archiveItem.Id, so that the client can navigate to it immediately after creation?
	//  // ...or should the CreateArchiveItem command include the the archiveItem.Id as a parameter? UUID maybe...
	// }


	public async Task Handle(DeleteArchiveItem command)
	{
		var success = await _archiveItemCommandService.DeleteArchiveItem(command.Id);
		if (!success)
		{
			throw new HttpNotFoundException();
		}
	}
}
