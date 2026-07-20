using System.Text.Json;
using System.Text.Json.Nodes;
using Backend.Core.Cqrs.Infrastructure;
using Backend.Mpa.Core.Services;
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
		public required string PartSpecifier { get; set; }
	}
}



// ReSharper disable once UnusedMember.Global
public class EmailCommandHandler :
	IAsyncCommandHandler<CreateArchiveItemsFromEmails>,
	IAsyncCommandHandler<CreateBlobsFromAttachments>
{
	private readonly ImapClientFactory _imapClientFactory;
	private readonly BlobService _blobService;
	private readonly ArchiveItemService _archiveItemService;

	public EmailCommandHandler(ImapClientFactory imapClientFactory,
							BlobService blobService,
							ArchiveItemService archiveItemService)
	{
		_imapClientFactory = imapClientFactory;
		_blobService = blobService;
		_archiveItemService = archiveItemService;
	}


	public async Task Handle(CreateArchiveItemsFromEmails command)
	{
		if (command.MessageIds.Count == 0)
		{
			return;
		}

		var imapClient = await _imapClientFactory.GetImapClient(command.ExternalAccountId);

		var emails = await imapClient.GetEmailsByIds(command.EmailFolder, command.MessageIds);
		foreach (var email in emails)
		{
			var title = email.Subject;
			var metadata = (JsonSerializer.SerializeToNode(new
			{
				email = new
				{
					to = email.To.Select(a => $"{a.Name} <{a.Address}>"),
					from = email.From.Select(a => $"{a.Name} <{a.Address}>"),
					date = email.ReceivedTime,
					subject = email.Subject,
					body = email.Body
				}
			}) as JsonObject)!;

			var uploadedBlobs = new List<(Stream Content, string Filename, string MimeType)>();
			foreach (var attachmentReference in email.Attachments)
			{
				var mimeEntity = await imapClient.DownloadAttachmentAsync(command.EmailFolder, email.UniqueId, attachmentReference.PartSpecifier);
				if (mimeEntity == null) continue;

				if (mimeEntity is not MimePart mimePart || mimePart.Content is null) continue;

				var stream = new MemoryStream() as Stream;
				await mimePart.Content.DecodeToAsync(stream);
				stream.Position = 0;

				uploadedBlobs.Add((stream, mimePart.FileName ?? attachmentReference.FileName, mimePart.ContentType.MimeType));
			}

			await _archiveItemService.CreateArchiveItem(title, [], metadata, [], uploadedBlobs);
		}
	}


	public async Task Handle(CreateBlobsFromAttachments command)
	{
		if (command.AttachmentReferences.Count == 0)
		{
			return;
		}

		var imapClient = await _imapClientFactory.GetImapClient(command.ExternalAccountId);

		var uploadedBlobs = new List<(Stream Content, string Filename, string MimeType)>();
		foreach (var attachmentReference in command.AttachmentReferences)
		{
			var mimeEntity = await imapClient.DownloadAttachmentAsync(command.EmailFolder, attachmentReference.MessageId, attachmentReference.PartSpecifier);
			if (mimeEntity == null) continue;


			if (mimeEntity is not MimePart mimePart || mimePart.Content is null) continue;

			var stream = new MemoryStream();
			await mimePart.Content.DecodeToAsync(stream);
			stream.Position = 0;

			uploadedBlobs.Add((stream, mimePart.FileName ?? "attachment", mimePart.ContentType.MimeType));
		}

		await _blobService.UploadBlobs(uploadedBlobs);
	}
}
