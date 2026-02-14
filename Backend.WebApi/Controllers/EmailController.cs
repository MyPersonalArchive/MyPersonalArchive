using Backend.Core;
using Backend.Core.Providers;
using Backend.DbModel.Database;
using Backend.EmailIngestion;
using Backend.WebApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

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
[Authorize(Policy = "TenantIdPolicy")]
public class EmailController : ControllerBase
{
	private readonly EmailProviderFactory _registry;
	private readonly MpaDbContext _dbContext;
	private readonly IFileStorageProvider _fileProvider;
	private readonly IAmbientDataResolver _resolver;

	public EmailController(EmailProviderFactory registry, MpaDbContext dbContext, IFileStorageProvider fileProvider, IAmbientDataResolver resolver)
	{
		_registry = registry;
		_dbContext = dbContext;
		_fileProvider = fileProvider;
		_resolver = resolver;
	}


	[HttpPost("{providerName}/auth/exchange")]
	public IActionResult ExchangeToken(string providerName, [FromBody] TokenRequestExchangeRequest token)
	{
		if (!_registry.TryGetProvider(providerName, out var provider) || provider == null)
		{
			return BadRequest($"Invalid provider: {providerName}");
		}

		var cookieOptions = new CookieOptions
		{
			HttpOnly = true,
			Secure = false, //TODO: Set to true in production
			SameSite = SameSiteMode.Strict
		};

		IAuthContext? authCookie = null;
		if (provider.AuthenticationMode == EmailAuthMode.Oath2)
		{
			throw new NotImplementedException("OAuth exchange not implemented in this endpoint. Use the RemoteAuthenticationController instead.");
		}
		else if (provider.AuthenticationMode == EmailAuthMode.Basic)
		{
			//TODO: Move this to the RemoteAuthenticationController as well?
			if (string.IsNullOrEmpty(token.Username) || string.IsNullOrEmpty(token.Password))
			{
				return BadRequest("missing username or password");
			}

			authCookie = new BasicAuthContext
			{
				Username = token.Username,
				Password = token.Password
			};
		}

		Response.Cookies.Append(
			$"auth-{providerName}",
			JsonSerializer.Serialize(authCookie),
			cookieOptions
		);
		return Ok(new { Ok = true });
	}



	[HttpGet("{providerName}/download-attachment")]
	public async Task<IActionResult> DownloadAttachment(
													Guid externalAccountId,
													[FromQuery] string messageId,
													[FromQuery] string fileName,
													[FromQuery] string folder,
													[FromServices] ExternalAccountService externalAccountService,
													[FromServices] EmailProviderFactory emailProviderFactory
	)
	{
		// --- BEGIN generic code to get the provider and connect ---
		var externalAccountSettings = await externalAccountService.GetExternalAccountSettingsAsync();

		var externalAccount = externalAccountSettings.ExternalAccounts.FirstOrDefault(a => a.Id == externalAccountId);
		if (externalAccount == null)
		{
			throw new Exception("External account not found");
		}

		if (!emailProviderFactory.TryGetProvider(externalAccount.Provider, out var provider))
		{
			throw new Exception("Unsupported email provider");
		}

		var auth = externalAccount.Credentials.Deserialize<OAuthContext>(JsonSerializerOptions.Web);

		var refreshedAuth = await provider.RefreshAccessTokenIfNeeded(auth);
		if (refreshedAuth != auth)
		{
			externalAccount.Credentials = JsonSerializer.SerializeToElement(refreshedAuth, JsonSerializerOptions.Web);
			await externalAccountService.Replace(externalAccount);
		}

		var imapClient = await provider.ConnectAsync(refreshedAuth, externalAccount.EmailAddress);
		// --- END generic code to get the provider and connect ---

		var attachment = await provider.DownloadAttachmentAsync(imapClient, folder, messageId, fileName);
		if (attachment == null) return NotFound();

		return File(attachment.Stream, "application/octet-stream", fileName);
	}



	#region Request and response models

	public record TokenRequestExchangeRequest
	{
		// public required string Provider { get; set; }
		public string? Code { get; set; }
		public string? RedirectUri { get; set; }
		public string? Username { get; set; }
		public string? Password { get; set; }
	}
	#endregion
}