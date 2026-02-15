using System.Text.Json;
using System.Text.Json.Nodes;
using Backend.Core;
using Backend.Core.Authentication;
using Backend.Core.Providers;
using Backend.DbModel.Database;
using Backend.DbModel.Database.EntityModels;
using Backend.EmailIngestion;
using Backend.WebApi.Services;

namespace Backend.WebApi.CqrsInfrastructure;



[RequireAllowedTenantId]
public class ListFolders : IQuery<ListFolders, IEnumerable<string>>
{
	public required string ExternalAccountId { get; set; }
}


[RequireAllowedTenantId]
public class ListEmails : IQuery<ListEmails, IEnumerable<EmailIngestion.Email>>
{
	public required Guid ExternalAccountId { get; set; }
	public required EmailSearchCriteria Criteria { get; set; }

	//TODO: define Email and SearchCriteria as nested classes here?
}


[RequireAllowedTenantId]
public class CreateArchiveItemsFromEmails : ICommand<CreateArchiveItemsFromEmails>
{
	public required Guid ExternalAccountId { get; set; }
	public required string EmailFolder { get; set; }
	public required List<string> MessageIds { get; set; }
}

[RequireAllowedTenantId]
public class CreateBlobsFromAttachments : ICommand<CreateBlobsFromAttachments>
{
	public required Guid ExternalAccountId { get; set; }
	public required string EmailFolder { get; set; }
	public required List<AttachmentReference> AttachmentReferences { get; set; }

	public class AttachmentReference
	{
		public required string MessageId { get; set; }
		public required string FileName { get; set; }
	}
}



public class EmailHandler :
	IAsyncQueryHandler<ListFolders, IEnumerable<string>>,
	IAsyncQueryHandler<ListEmails, IEnumerable<Email>>,
	IAsyncCommandHandler<CreateArchiveItemsFromEmails>,
	IAsyncCommandHandler<CreateBlobsFromAttachments>
{
	private readonly ExternalAccountService _externalAccountService;
	private readonly EmailProviderFactory _emailProviderFactory;
	private readonly MpaDbContext _dbContext;
	private readonly IAmbientDataResolver _resolver;
	private readonly IFileStorageProvider _fileProvider;

	public EmailHandler(ExternalAccountService externalAccountService,
					 EmailProviderFactory emailProviderFactory,
					 MpaDbContext dbContext,
					 IAmbientDataResolver resolver,
					 IFileStorageProvider fileProvider)
	{
		_externalAccountService = externalAccountService;
		_emailProviderFactory = emailProviderFactory;
		_dbContext = dbContext;
		_resolver = resolver;
		_fileProvider = fileProvider;
	}


	public async Task<IEnumerable<string>> Handle(ListFolders query)
	{
		// --- BEGIN generic code to get the provider and connect ---
		var externalAccountSettings = await _externalAccountService.GetExternalAccountSettingsAsync();

		var externalAccount = externalAccountSettings.ExternalAccounts.FirstOrDefault(a => a.Id.ToString() == query.ExternalAccountId);
		if (externalAccount == null)
		{
			throw new Exception("External account not found");
		}

		if (!_emailProviderFactory.TryGetProvider(externalAccount.Provider, out var provider))
		{
			throw new Exception("Unsupported email provider");
		}

		var auth = externalAccount.Credentials;

		var refreshedAuth = await provider.RefreshAccessTokenIfNeeded(auth);
		if (refreshedAuth != auth)
		{
			externalAccount.Credentials = refreshedAuth;
			await _externalAccountService.Replace(externalAccount);
		}

		var imapClient = await provider.ConnectAsync(refreshedAuth, externalAccount.EmailAddress);
		// --- END generic code to get the provider and connect ---

		return await provider.GetAvailableFolders(imapClient);
	}


	public async Task<IEnumerable<Email>> Handle(ListEmails query)
	{
		// --- BEGIN generic code to get the provider and connect ---
		var externalAccountSettings = await _externalAccountService.GetExternalAccountSettingsAsync();

		var externalAccount = externalAccountSettings.ExternalAccounts.FirstOrDefault(a => a.Id == query.ExternalAccountId);
		if (externalAccount == null)
		{
			throw new Exception("External account not found");
		}

		if (!_emailProviderFactory.TryGetProvider(externalAccount.Provider, out var provider))
		{
			throw new Exception("Unsupported email provider");
		}

		var auth = externalAccount.Credentials;

		var refreshedAuth = await provider.RefreshAccessTokenIfNeeded(auth);
		if (refreshedAuth != auth)
		{
			externalAccount.Credentials = refreshedAuth;
			await _externalAccountService.Replace(externalAccount);
		}

		var imapClient = await provider.ConnectAsync(refreshedAuth, externalAccount.EmailAddress);
		// --- END generic code to get the provider and connect ---

		return await provider.GetEmailsByCriteria(imapClient, query.Criteria);
	}


	public async Task Handle(CreateArchiveItemsFromEmails command)
	{
		if (command.MessageIds.Count == 0)
		{
			return;
		}

		// --- BEGIN generic code to get the provider and connect ---

		var externalAccountSettings = await _externalAccountService.GetExternalAccountSettingsAsync();

		var externalAccount = externalAccountSettings.ExternalAccounts.FirstOrDefault(a => a.Id == command.ExternalAccountId);
		if (externalAccount == null)
		{
			throw new Exception("External account not found");
		}

		if (!_emailProviderFactory.TryGetProvider(externalAccount.Provider, out var provider))
		{
			throw new Exception("Unsupported email provider");
		}

		var auth = externalAccount.Credentials;

		var refreshedAuth = await provider.RefreshAccessTokenIfNeeded(auth);
		if (refreshedAuth != auth)
		{
			externalAccount.Credentials = refreshedAuth;
			await _externalAccountService.Replace(externalAccount);
		}

		var imapClient = await provider.ConnectAsync(refreshedAuth, externalAccount.EmailAddress);

		// --- END generic code to get the provider and connect ---

		var emails = await provider.GetEmailsByIds(imapClient, command.EmailFolder, command.MessageIds);

		foreach (var email in emails)
		{
			var archiveItem = new ArchiveItem
			{
				TenantId = _resolver.GetCurrentTenantId()!.Value,
				Title = email.Subject,
				CreatedAt = DateTimeOffset.UtcNow,
				CreatedByUsername = _resolver.GetCurrentUsername(),
				Tags = [],
				DocumentDate = email.ReceivedTime,
				Metadata = (JsonSerializer.SerializeToNode(new
				{
					email = new
					{
						to = email.To.Select(a => $"{a.Name} <{a.EmailAddress}>"),
						from = email.From.Select(a => $"{a.Name} <{a.EmailAddress}>"),
						date = email.ReceivedTime,
						subject = email.Subject,
						body = email.Body
					}
				}) as JsonObject)!
			};

			if (email.Attachments.Count != 0)
			{
				foreach (var attachmentInfo in email.Attachments)
				{
					var filename = attachmentInfo.FileName;
					var attachment = await provider.DownloadAttachmentAsync(imapClient, command.EmailFolder, email.UniqueId, filename);
					if (attachment == null) continue;

					string pathInStore = await _fileProvider.Store(filename, attachment.ContentType, attachment.Stream);
					var blob = await CreateBlob(attachment, filename, pathInStore, archiveItem);

					await _dbContext.Blobs.AddAsync(blob);
					archiveItem.Blobs!.Add(blob);
				}
			}

			await _dbContext.ArchiveItems.AddAsync(archiveItem);
		}

		await _dbContext.SaveChangesAsync();
	}


	public async Task Handle(CreateBlobsFromAttachments command)
	{
		if (command.AttachmentReferences.Count == 0)
		{
			return;
		}

		// --- BEGIN generic code to get the provider and connect ---
		var externalAccountSettings = await _externalAccountService.GetExternalAccountSettingsAsync();

		var externalAccount = externalAccountSettings.ExternalAccounts.FirstOrDefault(a => a.Id == command.ExternalAccountId);
		if (externalAccount == null)
		{
			throw new Exception("External account not found");
		}

		if (!_emailProviderFactory.TryGetProvider(externalAccount.Provider, out var provider))
		{
			throw new Exception("Unsupported email provider");
		}

		var auth = externalAccount.Credentials;

		var refreshedAuth = await provider.RefreshAccessTokenIfNeeded(auth);
		if (refreshedAuth != auth)
		{
			externalAccount.Credentials = refreshedAuth;
			await _externalAccountService.Replace(externalAccount);
		}

		var imapClient = await provider.ConnectAsync(refreshedAuth, externalAccount.EmailAddress);
		// --- END generic code to get the provider and connect ---

		foreach (var attachmentReference in command.AttachmentReferences)
		{
			var filename = attachmentReference.FileName;
			var attachment = await provider.DownloadAttachmentAsync(imapClient, command.EmailFolder, attachmentReference.MessageId, filename);
			if (attachment == null) continue;

			string pathInStore = await _fileProvider.Store(filename, attachment.ContentType, attachment.Stream);
			var blob = await CreateBlob(attachment, filename, pathInStore, null!);
			await _dbContext.Blobs.AddAsync(blob);
		}

		await _dbContext.SaveChangesAsync();
	}


	private async Task<Blob> CreateBlob(Attachment downloadedAttachment, string fileName, string pathInStore, ArchiveItem archiveItem)
	{
		return new Blob
		{
			TenantId = _resolver.GetCurrentTenantId()!.Value,
			ArchiveItem = archiveItem,
			FileHash = _fileProvider.ComputeSha256Hash(downloadedAttachment.Stream),
			MimeType = downloadedAttachment.ContentType,
			OriginalFilename = fileName,
			PageCount = PreviewGenerator.GetDocumentPageCount(downloadedAttachment.ContentType, downloadedAttachment.Stream),
			FileSize = downloadedAttachment.FileSize,
			UploadedAt = DateTimeOffset.Now,
			UploadedByUsername = _resolver.GetCurrentUsername(),
			StoreRoot = StoreRoot.FileStorage.ToString(),
			PathInStore = pathInStore
		};
	}
}