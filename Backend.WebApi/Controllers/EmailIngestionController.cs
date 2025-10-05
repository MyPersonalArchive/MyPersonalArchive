using Backend.Core;
using Backend.Core.Providers;
using Backend.DbModel.Database;
using Backend.DbModel.Database.EntityModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

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
// [Authorize]
public class EmailIngestionController : ControllerBase
{
	private readonly EmailIngestionProviderFactory _registry;
	private readonly MpaDbContext _dbContext;
	private readonly IFileStorageProvider _fileProvider;
	private readonly AmbientDataResolver _resolver;

	public EmailIngestionController(EmailIngestionProviderFactory registry, MpaDbContext dbContext, IFileStorageProvider fileProvider, AmbientDataResolver resolver)
	{
		_registry = registry;
		_dbContext = dbContext;
		_fileProvider = fileProvider;
		_resolver = resolver;
	}

	[HttpGet("{provider}/auth/url")]
	public IActionResult GetAuthUrl(string provider, [FromQuery] string redirectUri)
	{
		if (!_registry.TryGetProvider(provider, out var prov))
			return BadRequest(new { error = $"Unknown provider: {provider}" });

		if (prov.AuthenticationMode != EmailIngestionAuthMode.Oath2)
			return BadRequest(new { error = $"{provider} does not support OAuth" });

		var state = Guid.NewGuid().ToString("N");
		var url = prov.GetAuthorizationUrl(state, redirectUri);
		return Ok(new AuthUrlResponse { Url = url, State = state });
	}

	[HttpPost("{provider}/auth/exchange")]
	public async Task<IActionResult> ExchangeToken([FromBody] TokenRequestExchangeRequest token)
	{
		if (!_registry.TryGetProvider(token.Provider, out var prov))
			return BadRequest(new { error = $"Unknown provider: {token.Provider}" });

		if (prov == null) return NotFound();

		if (prov.AuthenticationMode == EmailIngestionAuthMode.Oath2)
		{
			if (string.IsNullOrEmpty(token.Code) || string.IsNullOrEmpty(token.RedirectUri))
			{
				return BadRequest(new { error = "missing code or redirectUri" });
			}
			var tokens = await prov.ExchangeCodeForTokenAsync(token.Code, token.RedirectUri);

			Response.Cookies.Append(
			$"auth-{token.Provider}",
			JsonSerializer.Serialize(tokens),
			new CookieOptions
			{
				HttpOnly = true,
				Secure = true,
				SameSite = SameSiteMode.Strict
			});
		}
		else if (prov.AuthenticationMode == EmailIngestionAuthMode.Basic)
		{
			if (string.IsNullOrEmpty(token.Username) || string.IsNullOrEmpty(token.Password))
			{
				return BadRequest(new { error = "missing username or password" });
			}

			Response.Cookies.Append(
			$"auth-{token.Provider}",
			JsonSerializer.Serialize(new AuthContext
			{
				Username = token.Username,
				Password = token.Password
			}),
			new CookieOptions
			{
				HttpOnly = true,
				Secure = true,
				SameSite = SameSiteMode.Strict
			});
		}
		return Ok(new { Ok = true });
	}

	[HttpPost("{provider}/find-attachments")]
	public async Task<IActionResult> FindAttachments([FromBody] FindAttachmentsRequest request)
	{
		if (!_registry.TryGetProvider(request.Provider, out var prov))
			return BadRequest(new { error = $"Unknown provider: {request.Provider}" });

		if (!Request.Cookies.TryGetValue($"auth-{request.Provider}", out var authJson))
		{
			return Unauthorized();
		}

		var auth = JsonSerializer.Deserialize<AuthContext>(authJson);

		if (auth == null)
			return Unauthorized();

		if (prov.AuthenticationMode == EmailIngestionAuthMode.Oath2)
		{
			if (string.IsNullOrEmpty(auth?.AccessToken))
				return BadRequest(new { error = "missing access_token" });

			auth = AuthContext.FromOAuth(auth.AccessToken, auth.RefreshToken);
		}
		else
		{
			if (string.IsNullOrEmpty(auth.Username) || string.IsNullOrEmpty(auth.Password))
			{
				return BadRequest(new { error = "missing username or password" });
			}
			auth = AuthContext.FromBasic(auth.Username, auth.Password);
		}

		var results = await prov.FindAttachmentsAsync(auth, request);
		return Ok(new FindAttachmentsResponse { Attachments = [.. results] });
	}

	[HttpGet("{provider}/download-attachment")]
	public async Task<IActionResult> DownloadAttachment(string provider, [FromBody] DownloadAttachmentRequest download)
	{
		if (!_registry.TryGetProvider(provider, out var prov))
			return BadRequest(new { error = $"Unknown provider: {provider}" });

		if (!Request.Cookies.TryGetValue($"auth-{provider}", out var authJson))
		{
			return Unauthorized();
		}

		var auth = JsonSerializer.Deserialize<AuthContext>(authJson);

		if (auth == null)
			return Unauthorized();


		var attachment = await prov.DownloadAttachmentAsync(auth, download.MessageId, download.FileName);
		if (attachment == null) return NotFound();
		
		return File(attachment.Stream, "application/octet-stream", download.FileName);
	}
	
	[HttpPost("{provider}/unallocate-attachment")]
	public async Task<IActionResult> UnallocateAttachment(string provider, [FromBody] UploadAttachmentRequest download)
	{
		if (!_registry.TryGetProvider(provider, out var prov))
			return BadRequest(new { error = $"Unknown provider: {provider}" });

		if (!Request.Cookies.TryGetValue($"auth-{provider}", out var authJson))
		{
			return Unauthorized();
		}

		var auth = JsonSerializer.Deserialize<AuthContext>(authJson);

		if (auth == null)
			return Unauthorized();

		if (download.Attachments == null || !download.Attachments.Any())
		{
			return NoContent();
		}

		foreach (var attachment in download.Attachments)
		{
			try
			{
				var downloadedAttachment = await prov.DownloadAttachmentAsync(auth, attachment.MessageId, attachment.FileName);
				if (downloadedAttachment == null) return NotFound();

				var blob = new Blob
				{
					TenantId = _resolver.GetCurrentTenantId()!.Value,
					ArchiveItem = null,
					FileHash = _fileProvider.ComputeSha256Hash(downloadedAttachment.Stream),
					MimeType = downloadedAttachment.ContentType,
					OriginalFilename = attachment.FileName,
					PageCount = PreviewGenerator.GetDocumentPageCount(downloadedAttachment.ContentType, downloadedAttachment.Stream),
					FileSize = downloadedAttachment.FileSize,
					UploadedAt = DateTimeOffset.Now,
					UploadedByUsername = _resolver.GetCurrentUsername(),
					StoreRoot = StoreRoot.FileStorage.ToString(),
					PathInStore = await _fileProvider.Store(attachment.FileName, downloadedAttachment.ContentType, downloadedAttachment.Stream)
				};

				await _dbContext.Blobs.AddAsync(blob);
			}
			catch (Exception)
			{
				
			}
		}
		
		await _dbContext.SaveChangesAsync();
		return Ok();
	}
}

public class TokenRequestExchangeRequest
{
	public required string Provider { get; set; }
	public string? Code { get; set; }
	public string? RedirectUri { get; set; }
	public string? Username { get; set; }
	public string? Password { get; set; }
}

public class DownloadAttachmentRequest
{
	public required string MessageId { get; set; }
	public required string FileName { get; set; }
}

public class UploadAttachmentRequest
{
	public List<Attachment>? Attachments { get; set; }

	public class Attachment
	{
		public required string MessageId { get; set; }
		public required string FileName { get; set; }
	}
}

public class DownloadAttachmentResponse
{
	public required Stream Stream { get; set; }
	public required string ContentType { get; set; }
	public required long FileSize { get; set; }
}

public class AuthUrlResponse
{
	public required string State { get; set; }
	public required string Url { get; set; }
}

public class FindAttachmentsResponse
{
	public required EmailAttachment[] Attachments { get; set; }
}

public class FindAttachmentsRequest : EmailSearchCriteria
{
	public required string Provider { get; set; }
}
