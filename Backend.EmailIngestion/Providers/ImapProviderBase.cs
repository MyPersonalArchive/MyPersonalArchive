using MailKit;
using MailKit.Net.Imap;
using MailKit.Search;

public abstract class ImapProviderBase
{
	protected async Task<IList<EmailAttachment>> FindAttachmentsAsync(IImapClient client, EmailSearchCriteria searchCriteria)
	{
		var results = new List<EmailAttachment>();

		var inbox = client.Inbox;
		await inbox.OpenAsync(FolderAccess.ReadOnly);

		var uids = await inbox.SearchAsync(GenerateSearchQuery(searchCriteria));
		var limitedUids = uids.Reverse().Take(searchCriteria != null ? searchCriteria.Limit : 100).ToList();

		const int batchSize = 50;
		var allMessagesWithAttachments = new List<IMessageSummary>();

		//For better performance fetch in batches. This seems to be faster, at least on my account with ALOT of emails.
		//By requesting just the uniqueId and BodyStructure we don't have to download the message bodies.
		for (int i = 0; i < limitedUids.Count; i += batchSize)
		{
			var batch = limitedUids.Skip(i).Take(batchSize).ToList();
			var summaries = await inbox.FetchAsync(batch, MessageSummaryItems.UniqueId | MessageSummaryItems.BodyStructure);
			allMessagesWithAttachments.AddRange(summaries.Where(i => i.BodyParts?.Any(bp => bp.IsAttachment) == true));
		}

		foreach (var item in allMessagesWithAttachments)
		{
			var message = await inbox.GetMessageAsync(item.UniqueId);
			foreach (var part in message.BodyParts.OfType<MimeKit.MimePart>())
			{
				if (part.IsAttachment)
				{
					results.Add(new EmailAttachment(
						item.UniqueId.Id.ToString(),
						message.Subject,
						message.From.ToString(),
						message.Date.UtcDateTime,
						part.FileName ?? "attachment"
					));
				}
			}
		}

		await client.DisconnectAsync(true);
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