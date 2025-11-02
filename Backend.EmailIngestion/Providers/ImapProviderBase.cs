using MailKit;
using MailKit.Net.Imap;
using MailKit.Search;
using MimeKit;
using Org.BouncyCastle.Math.EC.Rfc7748;

namespace Backend.EmailIngestion.Providers;

public abstract class ImapProviderBase
{
	public abstract EmailAuthMode AuthenticationMode { get; }

	public abstract string Name { get; }

	public abstract string GetAuthorizationUrl(string state, string redirectUri);

	public abstract Task<IAuthContext> ExchangeCodeForTokenAsync(string code, string redirectUri);


	public async Task<IList<Email>> FindEmailsAsync(IAuthContext auth, EmailSearchCriteria searchCriteria)
	{
		using var client = await ConnectAsync(auth);
		return await FindEmailsAsync(client, searchCriteria);
	}

	public async Task<IList<Email>> FindEmailsAsync(IAuthContext auth, string folder, List<string> messageIds)
	{
		using var client = await ConnectAsync(auth);
		var mailFolder = client.GetFolder(folder);
		await mailFolder.OpenAsync(FolderAccess.ReadOnly);

		var uniqueIds = messageIds
						.Select(UniqueId.Parse)
						.ToList();

		var results = new List<Email>();
		foreach (var uniqueId in uniqueIds)
		{
			results.Add(await GetEmail(mailFolder, folder, uniqueId));
		}

		return results;
	}

	public async Task<Attachment?> DownloadAttachmentAsync(IAuthContext auth, string folder, string messageId, string fileName)
	{
		using var client = await ConnectAsync(auth);
		return await DownloadAttachmentAsync(client, folder, messageId, fileName);
	}

	public async Task<IList<string>> GetAvailableFolders(IAuthContext auth)
	{
		using var client = await ConnectAsync(auth);
		return await GetAvailableFolders(client);
	}

	protected abstract Task<IImapClient> ConnectAsync(IAuthContext auth);

	private async Task<IList<string>> GetAvailableFolders(IImapClient client)
	{
		var root = client.GetFolder(client.PersonalNamespaces[0]);
		var allFolders = await root.GetSubfoldersAsync(true);
		return allFolders.Select(f => f.FullName).ToList();

	}

	private async Task<IList<Email>> FindEmailsAsync(IImapClient client, EmailSearchCriteria searchCriteria)
	{
		var results = new List<Email>();

		var folders = searchCriteria.Folders;
		if (folders == null || !folders.Any())
		{
			//Folder names are case sensitive. Gmail, Fastmail uses default "INBOX", but for Outlook etc it's "Inbox".
			//If we shall allow users to search inboxes we need to solve this somehow?
			folders = ["INBOX"];
		}

		var searchQuery = GenerateSearchQuery(searchCriteria);
		foreach (var folder in folders)
		{
			var mailFolder = client.GetFolder(folder);
			await mailFolder.OpenAsync(FolderAccess.ReadOnly);

			var uids = await mailFolder.SearchAsync(searchQuery);
			var limitedUids = uids.Reverse().Take(searchCriteria?.Limit ?? 100).ToList();

			const int batchSize = 50;
			var messages = new List<IMessageSummary>();

			//For better performance fetch in batches. This seems to be faster, at least on my account with ALOT of emails.
			//By requesting just the uniqueId and BodyStructure we don't have to download the message bodies.
			for (int i = 0; i < limitedUids.Count; i += batchSize)
			{
				var batch = limitedUids.Skip(i).Take(batchSize).ToList();
				var summaries = await mailFolder.FetchAsync(batch, MessageSummaryItems.UniqueId | MessageSummaryItems.BodyStructure);
				messages.AddRange(summaries);
			}

			foreach (var item in messages)
			{
				results.Add(await GetEmail(mailFolder, folder, item.UniqueId));
			}
		}


		await client.DisconnectAsync(true);
		client.Dispose();
		return results;
	}

	private async Task<Attachment?> DownloadAttachmentAsync(IImapClient client, string folder, string messageId, string fileName)
	{
		var mailFolder = client.GetFolder(folder);
		await mailFolder.OpenAsync(FolderAccess.ReadOnly);

		var message = await mailFolder.GetMessageAsync(new UniqueId(uint.Parse(messageId)));

		foreach (var part in message.BodyParts.OfType<MimeKit.MimePart>())
		{
			if (part.IsAttachment && part.FileName == fileName)
			{
				var ms = new MemoryStream();
				await part.Content.DecodeToAsync(ms);
				ms.Position = 0;
				return new Attachment
				{
					Stream = ms,
					FileName = fileName,
					ContentType = part.ContentType.MimeType,
					FileSize = ms.Length
				};
			}
		}

		return null;
	}

	private async Task<Email> GetEmail(IMailFolder mailFolder, string folder, UniqueId uniqueId)
	{
		var message = await mailFolder.GetMessageAsync(uniqueId);
		var email = new Email()
		{
			UniqueId = uniqueId.Id.ToString(),
			Subject = message.Subject,
			From = message.From
				.Select(address => address is MailboxAddress mb
					? new Email.Address { EmailAddress = mb.ToString(), Name = string.IsNullOrWhiteSpace(mb.Name) ? mb.Address : mb.Name }
					: new Email.Address { EmailAddress = address.Name }
				),
			To = message.To
				.Select(address => address is MailboxAddress mb
					? new Email.Address { EmailAddress = mb.ToString(), Name = string.IsNullOrWhiteSpace(mb.Name) ? mb.Address : mb.Name }
					: new Email.Address { EmailAddress = address.Name }
				),
			ReceivedTime = message.Date,
			Body = message.TextBody,
			HtmlBody = message.HtmlBody
		};

		foreach (var part in message.BodyParts.OfType<MimeKit.MimePart>())
		{
			if (part.IsAttachment)
			{
				email.Attachments.Add(new Email.EmailAttachment
				{
					FileName = part.FileName ?? "attachment",
					ContentType = part.ContentType.MimeType
				});
			}
		}
		return email;
	}

	private SearchQuery GenerateSearchQuery(EmailSearchCriteria criteria)
	{
		var query = SearchQuery.All;
		if (criteria?.Subject != null)
		{
			query = query.And(SearchQuery.SubjectContains(criteria.Subject));
		}
		if (criteria?.From != null)
		{
			query = query.And(SearchQuery.FromContains(criteria.From));
		}
		if (criteria?.To != null)
		{
			query = query.And(SearchQuery.ToContains(criteria.To));
		}
		if (criteria?.Since != null)
		{
			query = query.And(SearchQuery.DeliveredAfter(criteria.Since.Value));
		}
		return query;
	}

	public abstract bool TryCreateAuthContext(string authJson, out IAuthContext? auth);
}