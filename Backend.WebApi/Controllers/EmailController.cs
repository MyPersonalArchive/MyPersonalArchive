using System.Security.Authentication;
using Backend.Core.Authentication;
using Backend.EmailIngestion;
using MailKit.Net.Imap;
using MimeKit;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.EmailIngestion.Services;

namespace Backend.WebApi.Controllers;

//TODO:
/*
	- We should know which attachments that has been added to our system so that we dont search/show them again (provider + unique messageId?)
		- We should be able to filter away unique email ids during search
	- We should be able to tell our system which emails/attachments we are not interested in to filter them out for future searches
		- Same as above, exclude provider + unique messageId?
	- We need to find a secure way to store oauth2 tokens and basic imap passwords
	- We should include the complete email when user adds an attachments
	- Implement more providers (maybe just outlook/hotmail for now? Rest can come later)
		- Outlook/hotmail (is this the same now?)
		- Zoho
		- Apple
		- Yahoo
	- UI for fetching and adding attachments/emails
*/


[ApiController]
[Route("api/[controller]")]
// [Authorize(Policy = "TenantIdPolicy")]
public class EmailController : ControllerBase
{
	private readonly ImapClientFactory _imapClientFactory;

	public EmailController(ImapClientFactory imapClientFactory)
	{
		_imapClientFactory = imapClientFactory;
	}


	[Authorize()]
	[HttpGet("download-attachment")]
	public async Task<IActionResult> DownloadAttachment([FromQuery] Guid externalAccountId,
														[FromQuery] uint messageId,
														[FromQuery] string fileName,
														[FromQuery] string folder)
	{
		var imapClient = await _imapClientFactory.GetImapClient(externalAccountId);

		var mimeEntity = await imapClient.DownloadAttachmentAsync(folder, messageId, fileName);
		if (mimeEntity is not MimePart mimePart) return NotFound();

		var stream = new MemoryStream();
		await mimePart.Content.DecodeToAsync(stream);
		stream.Position = 0;

		return File(stream, mimePart.ContentType.MimeType, fileName);
	}


	[Authorize()]
	[HttpGet("GetEmailsStreaming")]
	public async Task GetEmailsStreaming([FromQuery] Guid externalAccountId, [FromQuery] string folder)
	{
		var imapClient = await _imapClientFactory.GetImapClient(externalAccountId);

		Response.Headers.ContentType = "text/event-stream";
		var jsonOptions = new System.Text.Json.JsonSerializerOptions
		{
			PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase
		};
		await foreach (var email in imapClient.GetEmailsStreaming(folder))
		{
			var json = System.Text.Json.JsonSerializer.Serialize(email, jsonOptions);
			await Response.WriteAsync($"data: {json}\n\n");
			await Response.Body.FlushAsync();
		}
	}
}