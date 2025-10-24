using MailKit;
using MailKit.Net.Imap;
using MailKit.Search;
using MimeKit;
using Org.BouncyCastle.Math.EC.Rfc7748;

public abstract class ImapProviderBase
{
	protected async Task<IList<string>> GetAvailableFolders(IImapClient client)
	{
		var root = client.GetFolder(client.PersonalNamespaces[0]);
		var allFolders = await root.GetSubfoldersAsync(true);
		return allFolders.Select(f => f.FullName).ToList();

	}

	protected async Task<IList<Email>> FindAsync(IImapClient client, EmailSearchCriteria searchCriteria)
	{
		var results = new List<Email>();

		var folders = searchCriteria.Folders;
		if (folders == null || !folders.Any())
		{
			//Folder names are case sensitive. Gmail, Fastmail uses default "INBOX", but for Outlook etc it's "Inbox".
			//If we shall allow users to search inboxes we need to solve this somehow?
			folders = ["INBOX"];
		}

		foreach (var folder in folders)
		{
			var mailFolder = client.GetFolder(folder);
			await mailFolder.OpenAsync(FolderAccess.ReadOnly);

			var uids = await mailFolder.SearchAsync(GenerateSearchQuery(searchCriteria));
			var limitedUids = uids.Reverse().Take(searchCriteria != null ? searchCriteria.Limit : 100).ToList();

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
				var message = await mailFolder.GetMessageAsync(item.UniqueId);
				var email = new Email()
				{
					UniqueId = item.UniqueId.Id.ToString(),
					Subject = message.Subject,
					From = message.From
						.Select(address => address is MailboxAddress mb
							? new Email.Address { EmailAddress = mb.ToString(), Name = string.IsNullOrWhiteSpace(mb.Name) ? mb.Address : mb.Name }
							: new Email.Address { EmailAddress = address.Name}
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
						email.Attachments.Add(new EmailAttachment(
							part.FileName ?? "attachment",
							part.ContentType.MimeType
						));
					}
				}

				results.Add(email);
			}
		}


		await client.DisconnectAsync(true);
		client.Dispose();
		return results;
	}

	protected async Task<Attachment?> DownloadAttachmentAsync(IImapClient client, string messageId, string fileName)
	{
		var inbox = client.Inbox;
		await inbox.OpenAsync(FolderAccess.ReadOnly);

		var message = await inbox.GetMessageAsync(new UniqueId(uint.Parse(messageId)));

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
}