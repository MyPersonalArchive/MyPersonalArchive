using Backend.Core;
using Backend.Core.Cqrs.Infrastructure;
using Backend.Core.Infrastructure;
using Backend.Core.Providers;
using Backend.Mpa.DbModel.Database;
using Backend.Mpa.DbModel.Database.EntityModels;
using MimeKit;

namespace Backend.Mpa.EmailIngestion.Cqrs;


[RequireAllowedTenantId]
public class CreateArchiveItemsFromEmails : ICommand<CreateArchiveItemsFromEmails>
{
	public required Guid ExternalAccountId { get; set; }
	public required string EmailFolder { get; set; }
	public required List<uint> MessageIds { get; set; }
}


[RequireAllowedTenantId]
public class CreateBlobsFromAttachments : ICommand<CreateBlobsFromAttachments>
{
	public required Guid ExternalAccountId { get; set; }
	public required string EmailFolder { get; set; }
	public required List<AttachmentReference> AttachmentReferences { get; set; }

	public class AttachmentReference
	{
		public required uint MessageId { get; set; }
		public required string FileName { get; set; }
	}
}



// ReSharper disable once UnusedMember.Global
public class EmailCommandHandler :
	IAsyncCommandHandler<CreateArchiveItemsFromEmails>,
	IAsyncCommandHandler<CreateBlobsFromAttachments>
{
	private readonly ImapClientFactory _imapClientFactory;
	private readonly MpaDbContext _dbContext;
	private readonly IAmbientDataResolver _resolver;
	private readonly IFileStorageProvider _fileProvider;

	// private readonly BlobService _blobService;
	// private readonly ArchiveItemService _archiveItemService;

	public EmailCommandHandler(ImapClientFactory imapClientFactory,
							MpaDbContext dbContext,
							IAmbientDataResolver resolver,
							IFileStorageProvider fileProvider)
	{
		_imapClientFactory = imapClientFactory;
		_dbContext = dbContext;
		_resolver = resolver;
		_fileProvider = fileProvider;
	}


	public async Task Handle(CreateArchiveItemsFromEmails command)
	{
		throw new NotImplementedException("");
		// if (command.MessageIds.Count == 0)
		// {
		// 	return;
		// }

		// var imapClient = await GetImapClient(command.ExternalAccountId);

		// var emails = await imapClient.GetEmailsByIds(command.EmailFolder, command.MessageIds);
		// foreach (var email in emails)
		// {
		// 	var archiveItem = new ArchiveItem
		// 	{
		// 		TenantId = _resolver.GetCurrentTenantId()!.Value,
		// 		Title = email.Subject,
		// 		CreatedAt = DateTimeOffset.UtcNow,
		// 		CreatedByUsername = _resolver.GetCurrentUsername(),
		// 		Tags = [],
		// 		DocumentDate = email.ReceivedTime,
		// 		Metadata = (JsonSerializer.SerializeToNode(new
		// 		{
		// 			email = new
		// 			{
		// 				to = email.To.Select(a => $"{a.Name} <{a.Address}>"),
		// 				from = email.From.Select(a => $"{a.Name} <{a.Address}>"),
		// 				date = email.ReceivedTime,
		// 				subject = email.Subject,
		// 				body = email.Body
		// 			}
		// 		}) as JsonObject)!
		// 	};

		// 	if (email.Attachments.Count() != 0)
		// 	{
		// 		foreach (var attachmentInfo in email.Attachments)
		// 		{
		// 			var filename = attachmentInfo.FileName;
		// 			var attachment = await imapClient.DownloadAttachmentAsync(command.EmailFolder, email.UniqueId, filename);
		// 			if (attachment == null) continue;

		// 			string pathInStore = await _fileProvider.Store(filename, attachment.ContentType, attachment.Stream);
		// 			var blob = await CreateBlob(attachment, filename, pathInStore, archiveItem);

		// 			await _dbContext.Blobs.AddAsync(blob);
		// 			archiveItem.Blobs!.Add(blob);
		// 		}
		// 	}

		// 	await _dbContext.ArchiveItems.AddAsync(archiveItem);
		// }

		// await _dbContext.SaveChangesAsync();
	}


	public async Task Handle(CreateBlobsFromAttachments command)
	{

		if (command.AttachmentReferences.Count == 0)
		{
			return;
		}

		var imapClient = await _imapClientFactory.GetImapClient(command.ExternalAccountId);


		foreach (var attachmentReference in command.AttachmentReferences)
		{
			var filename = attachmentReference.FileName;
			var mimeEntity = await imapClient.DownloadAttachmentAsync(command.EmailFolder, attachmentReference.MessageId, filename);
			if (mimeEntity == null) continue;


			if (mimeEntity is not MimePart mimePart) continue;

			var stream = new MemoryStream();
			await mimePart.Content.DecodeToAsync(stream);
			stream.Position = 0;

			var pathInStore = await _fileProvider.Store(filename, mimePart.ContentType.MimeType, stream);
			var blob = await CreateBlob(mimePart, stream, filename, pathInStore, null!);
			await _dbContext.Blobs.AddAsync(blob);
		}

		await _dbContext.SaveChangesAsync();

		// throw new NotImplementedException("");
	}


	private async Task<Blob> CreateBlob(MimePart downloadedAttachment, Stream contentStream, string fileName, string pathInStore, ArchiveItem archiveItem)
	{
		return new Blob
		{
			TenantId = _resolver.GetCurrentTenantId()!.Value,
			ArchiveItem = archiveItem,
			FileHash = contentStream.ComputeSha256Hash(),
			MimeType = downloadedAttachment.ContentType.MimeType,
			OriginalFilename = fileName,
			PageCount = PreviewGenerator.GetDocumentPageCount(downloadedAttachment.ContentType.MimeType, contentStream),
			FileSize = downloadedAttachment.ContentDisposition?.Size ?? 0,
			UploadedAt = DateTimeOffset.Now,
			UploadedByUsername = _resolver.GetCurrentUsername() ?? throw new Exception("Missing NameIdentifier claim"),
			StoreRoot = StoreRoot.FileStorage.ToString(),
			PathInStore = pathInStore
		};
	}
}
