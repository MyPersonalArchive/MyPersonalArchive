
using System.Text.Json.Nodes;
using Backend.Core.Cqrs.Infrastructure;
using Backend.Mpa.Core.Services;

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
			public required string MimeType { get; set; }
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
			public required string MimeType { get; set; }
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

	public ArchiveItemsHandler(ArchiveItemService archiveItemService)
	{
		_archiveItemService = archiveItemService;
	}

	public async Task<GetArchiveItem.Response> Handle(GetArchiveItem query)
	{
		var archiveItem = await _archiveItemService.GetArchiveItem(query.Id);
		if (archiveItem == null)
		{
			throw new HttpNotFoundException();
		}

		return new GetArchiveItem.Response
		{
			Id = archiveItem.Id,
			Title = archiveItem.Title,
			Tags = [.. archiveItem.Tags.Select(tag => tag.Title)],
			Metadata = archiveItem.Metadata,
			CreatedAt = archiveItem.CreatedAt,
			DocumentDate = archiveItem.DocumentDate,
			BlobDisplayInfos = [.. archiveItem.Blobs?.Select(blob => new GetArchiveItem.Response.BlobDisplayInfo
				{
					Id = blob.Id,
					NumberOfPages = blob.PageCount,
					MimeType = blob.MimeType
				}).ToList() ?? []
			]
		};
	}

	public async Task<IEnumerable<ListArchiveItems.Response>> Handle(ListArchiveItems query)
	{
		var archiveItems = await _archiveItemService.ListArchiveItems();
		return archiveItems
			.Select(archiveItem => new ListArchiveItems.Response
			{
				Id = archiveItem.Id,
				Title = archiveItem.Title,
				Tags = archiveItem.Tags.Select(tag => tag.Title),
				BlobDisplayInfos = archiveItem.Blobs!.Select(blob => new ListArchiveItems.Response.BlobDisplayInfo()
				{
					Id = blob.Id,
					MimeType = blob.MimeType,
					NumberOfPages = blob.PageCount
				}),
				Metadata = archiveItem.Metadata,
				CreatedAt = archiveItem.CreatedAt,
				DocumentDate = archiveItem.DocumentDate
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
		var success = await _archiveItemService.DeleteArchiveItem(command.Id);
		if (!success)
		{
			throw new HttpNotFoundException();
		}
	}
}
