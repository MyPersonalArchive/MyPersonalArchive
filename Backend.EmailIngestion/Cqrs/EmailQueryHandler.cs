using Backend.Core.Cqrs.Infrastructure;

namespace Backend.EmailIngestion.Cqrs;


[RequireAllowedTenantId]
public class ListFolders : IQuery<ListFolders, IEnumerable<string>>
{
	public required Guid ExternalAccountId { get; set; }
}


[RequireAllowedTenantId]
public class GetEmailContents : IQuery<GetEmailContents, GetEmailContents.EmailContents>
{
	public required Guid ExternalAccountId { get; set; }
	public required string Folder { get; set; }
	public required uint MessageId { get; set; }

	public record EmailContents(string? Body, string? HtmlBody);
}


public class EmailQueryHandler :
	IAsyncQueryHandler<ListFolders, IEnumerable<string>>,
	IAsyncQueryHandler<GetEmailContents, GetEmailContents.EmailContents>
{
	private readonly ImapClientFactory _imapClientFactory;

	public EmailQueryHandler(ImapClientFactory imapClientFactory)
	{
		_imapClientFactory = imapClientFactory;
	}


	public async Task<IEnumerable<string>> Handle(ListFolders query)
	{
		var imapClient = await _imapClientFactory.GetImapClient(query.ExternalAccountId);
	
		return await imapClient.GetAvailableFolders();
	}


	public async Task<GetEmailContents.EmailContents> Handle(GetEmailContents query)
	{
		var imapClient = await _imapClientFactory.GetImapClient(query.ExternalAccountId);

		var emailContents = await imapClient.GetEmailContents(query.Folder, query.MessageId);
		if (emailContents == null)
		{
			throw new Exception($"Email with MessageId {query.MessageId} not found in folder {query.Folder}");
		}

		return new GetEmailContents.EmailContents(
			emailContents.PlainText,
			emailContents.Html
		);
	}

}