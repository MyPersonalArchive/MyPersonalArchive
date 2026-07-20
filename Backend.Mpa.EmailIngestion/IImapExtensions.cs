using MailKit;
using MailKit.Net.Imap;
using MimeKit;

namespace Backend.Mpa.EmailIngestion;

public static class IImapExtensions
{
	extension(IImapClient client)
	{
		public async Task<IList<FullEmail>> GetEmailsByIds(string folder, List<uint> messageIds)
		{
			var uniqueIds = messageIds
							.Select(id => new UniqueId(id))
							.ToList();

			var mailFolder = client.GetFolder(folder);
			await mailFolder.OpenAsync(FolderAccess.ReadOnly);

			return await Task.WhenAll(uniqueIds.Select(async uniqueId => await GetEmailAsync(mailFolder, uniqueId)));
		}

		private static async Task<FullEmail> GetEmailAsync(IMailFolder mailFolder, UniqueId uniqueId)
		{
			var message = await mailFolder.GetMessageAsync(uniqueId) ?? throw new Exception($"Email with UniqueId {uniqueId.Id} not found in folder {mailFolder.FullName}");
			var email = new FullEmail
			{
				UniqueId = uniqueId.Id,
				Subject = message.Subject ?? string.Empty,
				From = message.From
					.Select(address => address is MailboxAddress mb
						? new FullEmail.EmailAddress(mb.ToString(), string.IsNullOrWhiteSpace(mb.Name) ? mb.Address : mb.Name)
						: new FullEmail.EmailAddress(address.Name ?? string.Empty, null)
					),
				To = message.To
					.Select(address => address is MailboxAddress mb
						? new FullEmail.EmailAddress(mb.ToString(), string.IsNullOrWhiteSpace(mb.Name) ? mb.Address : mb.Name)
						: new FullEmail.EmailAddress(address.Name ?? string.Empty, null)
					),
				ReceivedTime = message.Date,
				Body = message.TextBody,
				HtmlBody = message.HtmlBody,
				Attachments = EnumerateAttachments(message)
			};
			return email;
		}


		private static IEnumerable<FullEmail.EmailAttachment> EnumerateAttachments(MimeMessage message)
		{
			var iter = new MimeIterator(message);
			while (iter.MoveNext())
			{
				if (iter.Current is MimePart part && part.IsAttachment)
				{
					yield return new FullEmail.EmailAttachment(
						part.FileName ?? "attachment",
						part.ContentType.MimeType,
						part.ContentDisposition?.Size,
						iter.PathSpecifier);
				}
			}
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

			await client.DisconnectAsync(true);
			client.Dispose();
		}


		public async Task<EmailBodyContent?> GetEmailContents(string folder, uint messageId)
		{
			var mailFolder = await client.GetFolderAsync(folder);
			await mailFolder.OpenAsync(FolderAccess.ReadOnly);

			var summaries = await mailFolder.FetchAsync([new UniqueId(messageId)], MessageSummaryItems.BodyStructure);
			var summary = summaries.FirstOrDefault();
			if (summary == null)
			{
				return null;
			}

			string? plainText = null;
			string? htmlText = null;

			if (summary.TextBody is BodyPartText textPart)
			{
				var entity = (TextPart)await mailFolder.GetBodyPartAsync(new UniqueId(messageId), textPart);
				plainText = entity.Text;
			}

			if (summary.HtmlBody is BodyPartText htmlPart)
			{
				var entity = (TextPart)await mailFolder.GetBodyPartAsync(new UniqueId(messageId), htmlPart);
				htmlText = entity.Text;
			}

			return new EmailBodyContent(plainText, htmlText);
		}




		public async Task<MimeEntity?> DownloadAttachmentAsync(string folder, uint messageId, string partSpecifier)
		{
			var mailFolder = await client.GetFolderAsync(folder);
			await mailFolder.OpenAsync(FolderAccess.ReadOnly);

			var summaries = await mailFolder.FetchAsync([new UniqueId(messageId)], MessageSummaryItems.BodyStructure);
			var summary = summaries.FirstOrDefault();
			if (summary == null)
			{
				return null;
			}

			var attachementPart = summary.BodyParts.FirstOrDefault(part => part.IsAttachment && part.PartSpecifier == partSpecifier);
			if (attachementPart == null)
			{
				return null;
			}

			var mimeEntity = await mailFolder.GetBodyPartAsync(new UniqueId(messageId), attachementPart);
			return mimeEntity;
		}
	}


	private static EmailSummary ConvertSummaryToEmail(IMessageSummary summary)
	{
		return new EmailSummary
		{
			UniqueId = summary.UniqueId.Id,
			Subject = summary.NormalizedSubject,
			PreviewText = summary.PreviewText ?? "n/a",
			From = summary.Envelope?.From
				.Select(address => address is MailboxAddress mb
					? new EmailSummary.EmailAddress(mb.ToString(), string.IsNullOrWhiteSpace(mb.Name) ? mb.Address : mb.Name)
					: new EmailSummary.EmailAddress(address.Name ?? string.Empty, address.Name)
				) ?? Enumerable.Empty<EmailSummary.EmailAddress>(),
			To = summary.Envelope?.To
				.Select(address => address is MailboxAddress mb
					? new EmailSummary.EmailAddress(mb.ToString(), string.IsNullOrWhiteSpace(mb.Name) ? mb.Address : mb.Name)
					: new EmailSummary.EmailAddress(address.Name ?? string.Empty, address.Name)
				) ?? Enumerable.Empty<EmailSummary.EmailAddress>(),
			ReceivedTime = summary.InternalDate ?? DateTimeOffset.MinValue,
			Attachments = summary.Attachments.Select(a => new EmailSummary.EmailAttachment(a.FileName ?? "attachment", a.ContentType.MimeType, a.PartSpecifier))
		};
	}

}


public class EmailSummary
{
	public uint UniqueId { get; set; }
	public string Subject { get; set; } = string.Empty;
	public string PreviewText { get; internal set; } = string.Empty;
	public DateTimeOffset ReceivedTime { get; set; }
	public IEnumerable<EmailAddress> From { get; set; } = [];
	public IEnumerable<EmailAddress> To { get; set; } = [];
	public IEnumerable<EmailAttachment> Attachments { get; set; } = [];


	public record EmailAddress(string Address, string? Name);

	public record EmailAttachment(string FileName, string ContentType, string PartSpecifier);
}



public record EmailBodyContent(string? PlainText, string? Html);


public class FullEmail
{
	public uint UniqueId { get; set; }
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
		long? FileSize,
		string PartSpecifier
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
