using Microsoft.AspNetCore.Http.HttpResults;

namespace Backend.WebApi.CqrsInfrastructure;

[RequireAllowedTenantId]
public class AccountListQuery : IQuery<AccountListQuery, IEnumerable<AccountListQuery.Result>>
{
	// No parameters to list commands

	public class Result
	{
		public int Id {get;set;}
		public string DisplayName {get;set;}
		public string Credentials {get;set;}
		public string Type {get;set;}
		public string Provider {get;set;}
	}
}


public class AccountHandler : IQueryHandler<AccountListQuery, IEnumerable<AccountListQuery.Result>>
{
	public IEnumerable<AccountListQuery.Result> Handle(AccountListQuery query)
	{
		var results = new List<AccountListQuery.Result>
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
