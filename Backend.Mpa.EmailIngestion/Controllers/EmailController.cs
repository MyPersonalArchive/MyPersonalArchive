using MimeKit;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;

namespace Backend.Mpa.EmailIngestion.Controllers;


[ApiController]
[Route("api/[controller]")]
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
														[FromQuery] string partSpecifier,
														[FromQuery] string folder)
	{
		var imapClient = await _imapClientFactory.GetImapClient(externalAccountId);

		var mimeEntity = await imapClient.DownloadAttachmentAsync(folder, messageId, partSpecifier);
		if (mimeEntity is not MimePart mimePart || mimePart.Content is null) return NotFound();

		var stream = new MemoryStream();
		await mimePart.Content.DecodeToAsync(stream);
		stream.Position = 0;

		return File(stream, mimePart.ContentType.MimeType, mimePart.FileName ?? "attachment");
	}


	[Authorize()]
	[HttpGet("GetEmailsStreaming")]
	public async Task GetEmailsStreaming([FromQuery] Guid externalAccountId, [FromQuery] string folder)
	{
		var imapClient = await _imapClientFactory.GetImapClient(externalAccountId);

		Response.Headers.ContentType = "text/event-stream";

		await foreach (var email in imapClient.GetEmailsStreaming(folder))
		{
			if (HttpContext.RequestAborted.IsCancellationRequested)
				break;

			var json = System.Text.Json.JsonSerializer.Serialize(email, JsonSerializerDefaults.Options);
			await Response.WriteAsync($"data: {json}\n\n");
			await Response.Body.FlushAsync();
		}

	}
}