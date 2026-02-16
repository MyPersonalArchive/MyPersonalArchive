using Backend.EmailIngestion;
using Backend.WebApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.WebApi.Controllers;

//TODO:
/*
	- We should know which attachments that has been added to our system so that we dont search/show them again (provider + unique messageId?)
		- We should be able to filter away unique email ids during search
	- We should be able to tell our system which emails/attachments we are not interested in to filter them out for future searches
		- Same as above, exclude provider + unique messageId?
	- We need to find a secure way to store oauth2 tokens and basic imap passwords
	- We should include the complete email when user adds an attachments
	- Implement more providers (maybe just outlook/hoitmail for now? Rest can come later)
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
	private readonly ExternalAccountService _externalAccountService;
	private readonly AuthProviderFactory _emailProviderFactory;

	public EmailController(ExternalAccountService externalAccountService, AuthProviderFactory emailProviderFactory)
	{
		_externalAccountService = externalAccountService;
		_emailProviderFactory = emailProviderFactory;
	}


	[Authorize()]
	[HttpGet("download-attachment")]
	public async Task<IActionResult> DownloadAttachment([FromQuery] Guid externalAccountId,
														[FromQuery] string messageId,
														[FromQuery] string fileName,
														[FromQuery] string folder)
	{
		// --- BEGIN generic code to get the provider and connect ---
		var externalAccountSettings = await _externalAccountService.GetExternalAccountSettingsAsync();

		var externalAccount = externalAccountSettings.ExternalAccounts.FirstOrDefault(a => a.Id == externalAccountId);
		if (externalAccount == null)
		{
			throw new Exception("External account not found");
		}

		if (!_emailProviderFactory.TryGetProvider(externalAccount.Provider, out var provider))
		{
			throw new Exception("Unsupported email provider");
		}

		var auth = externalAccount.Credentials;

		var refreshedAuth = await provider.RefreshAccessTokenIfNeeded(auth);
		if (refreshedAuth != auth)
		{
			externalAccount.Credentials = refreshedAuth;
			await _externalAccountService.Replace(externalAccount);
		}

		var imapClient = await provider.ConnectAsync(refreshedAuth, externalAccount.EmailAddress);
		// --- END generic code to get the provider and connect ---

		var attachment = await imapClient.DownloadAttachmentAsync(folder, messageId, fileName);
		if (attachment == null) return NotFound();

		return File(attachment.Stream, "application/octet-stream", fileName);
	}
}