using MailKit;
using MailKit.Net.Imap;
using MailKit.Search;
using MimeKit;


namespace Backend.EmailIngestion;

public static class IImapExtensions
{
	extension(IImapClient client)
	{
		public async Task<IList<EmailSummary>> GetEmailsByIds(string folder, List<string> messageIds)
		{
			var mailFolder = client.GetFolder(folder);
			await mailFolder.OpenAsync(FolderAccess.ReadOnly);

			var uniqueIds = messageIds
							.Select(UniqueId.Parse)
							.ToList();

			var results = new List<EmailSummary>();
			foreach (var uniqueId in uniqueIds)
			{
				results.Add(await GetEmailAsync(mailFolder, uniqueId));
			}

			return results;
		}


		public async Task<IList<string>> GetAvailableFolders()
		{
			var root = client.GetFolder(client.PersonalNamespaces[0]);
			var allFolders = await root.GetSubfoldersAsync(true);
			return allFolders.Select(f => f.FullName).ToList();
		}


		public async IAsyncEnumerable<EmailSummary> GetEmailsStreaming(string folder, int numberOfEmailsToFetch = 2000 /*, uint sinceUniqueId = uint.MaxValue*/)
		{
			var mailFolder = await client.GetFolderAsync(folder);
			await mailFolder.OpenAsync(FolderAccess.ReadOnly);

			var batchSizes = new Queue<int>([1, 8, 100, 1000, 1000, 1000]); //First fetch a few emails for faster "first email", and for scrolling the first page(s) retrieval, then increase batch size for better overall performance

			// Start from the newest email (end of mailbox) and work backwards
			int startIndex = mailFolder.Count - 1;
			int endIndexTarget = Math.Max(-1, startIndex - numberOfEmailsToFetch + 1);

			int toIndex = startIndex;
			int emailsYielded = 0;
			uint lastUniqueIdFetched;

			while (toIndex > endIndexTarget && emailsYielded < numberOfEmailsToFetch)
			{
				int batchSize = batchSizes.Dequeue();
				int fromIndex = Math.Max(0, toIndex - batchSize + 1);

				var summaries = await mailFolder.FetchAsync(fromIndex, toIndex, MessageSummaryItems.Envelope | MessageSummaryItems.InternalDate | MessageSummaryItems.BodyStructure | MessageSummaryItems.PreviewText);
				foreach (var item in summaries.Reverse())
				{
					if (emailsYielded >= numberOfEmailsToFetch)
						break;
					yield return ConvertSummaryToEmail(item);
					emailsYielded++;

					lastUniqueIdFetched = item.UniqueId.Id; //keep updating lastUniqueIdFetched as we yield emails, so it always represents the UniqueID of the last email that was fetched/yielded. This is important for the client to know where to continue fetching from when requesting the next batch/page of emails
				}

				toIndex = fromIndex - 1;
			}

			// yield return new EmailMetadata
			// {
			// 	GetMoreEmailsFromUniqueId = toIndex >= 0 ? lastUniqueIdFetched : (uint?)null
			// };


			await client.DisconnectAsync(true);
			client.Dispose();
		}


		public async Task<Stream?> DownloadAttachmentAsync(string folder, string messageId, string fileName)
		{
			var mailFolder = await client.GetFolderAsync(folder);
			await mailFolder.OpenAsync(FolderAccess.ReadOnly);

			var message = await mailFolder.GetMessageAsync(new UniqueId(uint.Parse(messageId)));

			foreach (var part in message.BodyParts.OfType<MimePart>())
			{
				if (part.IsAttachment && part.FileName == fileName)
				{
					var ms = new MemoryStream();
					await part.Content.DecodeToAsync(ms);
					ms.Position = 0;
					return ms;
				}
			}

			return null;
		}
	}


	private static EmailSummary ConvertSummaryToEmail(IMessageSummary summary)
	{
		return new EmailSummary
		{
			UniqueId = summary.UniqueId.Id.ToString(),
			Subject = summary.NormalizedSubject,
			PreviewText = summary.PreviewText ?? "n/a",
			From = summary.Envelope.From
				.Select(address => address is MailboxAddress mb
					? new EmailSummary.EmailAddress(mb.ToString(), string.IsNullOrWhiteSpace(mb.Name) ? mb.Address : mb.Name)
					: new EmailSummary.EmailAddress(address.Name, address.Name)
				),
			To = summary.Envelope.To
				.Select(address => address is MailboxAddress mb
					? new EmailSummary.EmailAddress(mb.ToString(), string.IsNullOrWhiteSpace(mb.Name) ? mb.Address : mb.Name)
					: new EmailSummary.EmailAddress(address.Name, address.Name)
				),
			ReceivedTime = summary.InternalDate ?? DateTimeOffset.MinValue,
			Attachments = summary.Attachments.Select(a => new EmailSummary.EmailAttachment(a.FileName ?? "attachment", a.ContentType.MimeType))
		};
	}


	private static async Task<FullEmail> GetEmailAsync(IMailFolder mailFolder, UniqueId uniqueId)
	{
		var message = await mailFolder.GetMessageAsync(uniqueId);
		var email = new FullEmail
		{
			UniqueId = uniqueId.Id.ToString(),
			Subject = message.Subject,
			From = message.From
				.Select(address => address is MailboxAddress mb
					? new FullEmail.EmailAddress(mb.ToString(), string.IsNullOrWhiteSpace(mb.Name) ? mb.Address : mb.Name)
					: new FullEmail.EmailAddress(address.Name, address.Name)
				),
			To = message.To
				.Select(address => address is MailboxAddress mb
					? new FullEmail.EmailAddress(mb.ToString(), string.IsNullOrWhiteSpace(mb.Name) ? mb.Address : mb.Name)
					: new FullEmail.EmailAddress(address.Name, address.Name)
				),
			ReceivedTime = message.Date,
			Body = message.TextBody,
			HtmlBody = message.HtmlBody,
			Attachments = message.BodyParts.OfType<MimePart>().Where(part => part.IsAttachment)
				.Select(part => new FullEmail.EmailAttachment(part.FileName ?? "attachment", part.ContentType.MimeType, null /* FileSize is not set here, as it would require fully downloading the attachment */))
		};

		return email;
	}


	private static SearchQuery GenerateSearchQuery(EmailSearchCriteria criteria)
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


public class EmailSummary
{
	public string UniqueId { get; set; } = string.Empty;
	public string Subject { get; set; } = string.Empty;
	public string PreviewText { get; internal set; } = string.Empty;
	// public string? Body { get; set; }
	// public string? HtmlBody { get; set; }
	public DateTimeOffset ReceivedTime { get; set; }
	public IEnumerable<EmailAddress> From { get; set; } = [];
	public IEnumerable<EmailAddress> To { get; set; } = [];
	public IEnumerable<EmailAttachment> Attachments { get; set; } = [];


	public record EmailAddress(string Address, string? Name);

	public record EmailAttachment(string FileName, string ContentType);
}



public record EmailBodyContent(string? PlainText, string? Html);


public class FullEmail
{
	public string UniqueId { get; set; } = string.Empty;
	public string Subject { get; set; } = string.Empty;
	public string PreviewText { get; internal set; } = string.Empty;
	public string? Body { get; set; }
	public string? HtmlBody { get; set; }
	public DateTimeOffset ReceivedTime { get; set; }
	public IEnumerable<EmailAddress> From { get; set; } = [];
	public IEnumerable<EmailAddress> To { get; set; } = [];
	public IEnumerable<EmailAttachment> Attachments { get; set; } = [];


	public record EmailAddress(
		string Address,
		string? Name);
    
	public record EmailAttachment(
		string FileName,
		string ContentType,
		long? FileSize
	);
}




public class EmailSearchCriteria
{
	public List<string>? Folders { get; set; }
	public string? Subject { get; set; }
	public string? From { get; set; }
	public string? To { get; set; }
	public int Limit { get; set; }
	public DateTime? Since { get; set; }
}
