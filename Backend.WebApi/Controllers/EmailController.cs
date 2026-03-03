using System.Security.Authentication;
using Backend.Core.Authentication;
using Backend.EmailIngestion;
using Backend.EmailIngestion.ImapClientProviders;
using Backend.WebApi.Services;
using MailKit.Net.Imap;
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
	private readonly AccessTokenHelper _accessTokenHelper;
	private readonly EmailProviderService _emailProviderService;

	public EmailController(ExternalAccountService externalAccountService, AccessTokenHelper accessTokenHelper, EmailProviderService emailProviderService)
	{
		_externalAccountService = externalAccountService;
		_accessTokenHelper = accessTokenHelper;
		_emailProviderService = emailProviderService;
	}


	[Authorize()]
	[HttpGet("download-attachment")]
	public async Task<IActionResult> DownloadAttachment([FromQuery] Guid externalAccountId,
														[FromQuery] string messageId,
														[FromQuery] string fileName,
														[FromQuery] string folder)
	{
		var imapClient = await GetImapClient(externalAccountId);

		var attachment = await imapClient.DownloadAttachmentAsync(folder, messageId, fileName);
		if (attachment == null) return NotFound();

		return File(attachment.Stream, "application/octet-stream", fileName);
	}


	[Authorize()]
	[HttpGet("GetEmailsStreaming")]
	public async Task GetEmailsStreaming([FromQuery] Guid externalAccountId,
														[FromQuery] string folder)
	{
		var imapClient = await GetImapClient(externalAccountId);

		Response.Headers.Add("Content-Type", "text/event-stream");
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

	private async Task<IImapClient> GetImapClient(Guid externalAccountId)
	{
		var externalAccountSettings = await _externalAccountService.GetExternalAccountSettingsAsync();
		var externalAccount = externalAccountSettings.GetExternalAccount(externalAccountId);

		var emailProviderSettings = await _emailProviderService.GetEmailProviderSettingsAsync();
		var authType = emailProviderSettings.GetAuthType(externalAccount.Provider, externalAccount.Credentials.Type);
		var emailProvider = emailProviderSettings.GetEmailProvider(externalAccount.Provider);

		var auth = externalAccount.Credentials;

		var refreshedAuth = await _accessTokenHelper.RefreshAccessTokenIfNeeded(auth, authType);
		if (refreshedAuth != auth)
		{
			externalAccount.Credentials = refreshedAuth;
			await _externalAccountService.Replace(externalAccount);
		}

		try
		{
			var imapClient = await ImapClientFactory.ConnectAsync(refreshedAuth, externalAccount.EmailAddress, emailProvider);
			return imapClient;
		}
		catch (AuthenticationException) when (refreshedAuth is OAuthContext)
		{
			// Token was rejected by the server despite our clock saying it's valid.
			// This can happen due to clock drift, revocation, or provider-side expiry.
			// Force a refresh and retry once.
			var forcedAuth = await _accessTokenHelper.ForceRefreshAccessToken(refreshedAuth, authType);
			externalAccount.Credentials = forcedAuth;
			await _externalAccountService.Replace(externalAccount);

			return await ImapClientFactory.ConnectAsync(forcedAuth, externalAccount.EmailAddress, emailProvider);
		}
	}
}