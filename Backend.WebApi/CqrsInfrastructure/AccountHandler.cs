using Microsoft.AspNetCore.Http.HttpResults;

namespace Backend.WebApi.CqrsInfrastructure;

[RequireAllowedTenantId]
public class ListAccounts : IQuery<ListAccounts, IEnumerable<ListAccounts.Result>>
{
	// No parameters to list accounts

	public class Result
	{
		public int Id {get;set;}
		public required string DisplayName {get;set;}
		public required string Credentials {get;set;}
		public required string Type {get;set;}
		public required string Provider {get;set;}
	}
}


public class AccountHandler : IQueryHandler<ListAccounts, IEnumerable<ListAccounts.Result>>
{
	public IEnumerable<ListAccounts.Result> Handle(ListAccounts query)
	{
		//TODO: Replace with real data from database
		var results = new List<ListAccounts.Result>
		{
			new() {
				Id = 1,
				DisplayName = "peter.pan@zoho.example",
				Credentials = "peter.pan@zoho.example",
				Type = "Email (IMAP)",
				Provider = "Zoho mail"
			},
			new() {
				Id = 2,
				DisplayName = "My work mail",
				Credentials = "peter@work.example",
				Type = "Email (IMAP)",
				Provider = "GMail"
			},
			new() {
				Id = 3,
				DisplayName = "My private mail",
				Credentials = "peter.private@fastmail.example",
				Type = "Email (IMAP)",
				Provider = "Fastmail"
			},
			new() {
				Id = 4,
				DisplayName = "Dropbox (private)",
				Credentials = "peter.private@fastmail.example",
				Type = "Files",
				Provider = "Dropbox"
			},
			new() {
				Id = 5,
				DisplayName = "Onedrive at work",
				Credentials = "peter@work.example",
				Type = "Files",
				Provider = "Onedrive"
			}
		};
		return results;
	}
}
