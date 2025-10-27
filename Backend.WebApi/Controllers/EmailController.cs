using Backend.Core;
using Backend.Core.Providers;
using Backend.DbModel.Database;
using Backend.DbModel.Database.EntityModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net;
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
public class EmailController : ControllerBase
{
	private readonly EmailProviderFactory _registry;
	private readonly MpaDbContext _dbContext;
	private readonly IFileStorageProvider _fileProvider;
	private readonly AmbientDataResolver _resolver;

	public EmailController(EmailProviderFactory registry, MpaDbContext dbContext, IFileStorageProvider fileProvider, AmbientDataResolver resolver)
	{
		_registry = registry;
		_dbContext = dbContext;
		_fileProvider = fileProvider;
		_resolver = resolver;
	}

	[HttpGet("{providerName}/auth/url")]
	public ActionResult<AuthUrlResponse> GetAuthUrl(string providerName, [FromQuery] string redirectUri)
	{
		if (!_registry.TryGetProvider(providerName, out var provider))
			return BadRequest(new { error = $"Unknown provider: {providerName}" });

		if (provider.AuthenticationMode != EmailAuthMode.Oath2)
			return BadRequest(new { error = $"{providerName} does not support OAuth" });

		//The random guid (nonce) should be validated on the callback on the client to verify that the state is the same
		var rawState = new
		{
			provider = providerName,
			nonce = Guid.NewGuid().ToString("N")
		};
		var stateJson = JsonSerializer.Serialize(rawState);
		var encodedState = WebUtility.UrlEncode(stateJson);

		var url = provider.GetAuthorizationUrl(encodedState, redirectUri);
		return Ok(new AuthUrlResponse { Url = url, State = encodedState });
	}

	[HttpPost("{provider}/auth/exchange")]
	public async Task<IActionResult> ExchangeToken([FromBody] TokenRequestExchangeRequest token)
	{
		if (!_registry.TryGetProvider(token.Provider, out var provider))
		{
			return BadRequest(new { error = $"Unknown provider: {token.Provider}" });
		}

		if (provider == null) return NotFound();    //TODO: Denne kan vel ikke være null pga sjekken over?

		if (provider.AuthenticationMode == EmailAuthMode.Oath2)
		{
			if (string.IsNullOrEmpty(token.Code) || string.IsNullOrEmpty(token.RedirectUri))
			{
				return BadRequest(new { error = "missing code or redirectUri" });
			}
			var tokens = await provider.ExchangeCodeForTokenAsync(token.Code, token.RedirectUri);

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
		else if (provider.AuthenticationMode == EmailAuthMode.Basic)
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

	[HttpGet("{providerName}/list-folders")]
	public async Task<IActionResult> GetFolders(string providerName)
	{
		if (!_registry.TryGetProvider(providerName, out var provider))
		{
			return BadRequest(new { error = $"Unknown provider: {providerName}" });
		}

		if (!TryGetAuthContextFromCookies(providerName, out var auth))
		{
			return Unauthorized();
		}

		if (provider.AuthenticationMode == EmailAuthMode.Oath2)
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

		return Ok(await provider.GetAvailableFolders(auth));
	}



	[HttpPost("{providerName}/list")]
	public async Task<ActionResult<IEnumerable<ListEmailsResponse>>> List(string providerName, [FromBody] ListEmailsRequest request)
	{
		if (!_registry.TryGetProvider(providerName, out var provider))
		{
			return BadRequest(new { error = $"Unknown provider: {providerName}" });
		}

		if (!TryGetAuthContextFromCookies(providerName, out var auth))
		{
			return Unauthorized();
		}

		if (provider.AuthenticationMode == EmailAuthMode.Oath2)
		{
			if (string.IsNullOrEmpty(auth?.AccessToken))
			{
				return BadRequest(new { error = "missing access_token" });
			}
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

		var emails = await provider.FindAttachmentsAsync(auth, request);
		return Ok(emails.Select(email => new ListEmailsResponse
		{
			UniqueId = email.UniqueId,
			Subject = email.Subject,
			Body = email.Body,
			HtmlBody = email.HtmlBody,
			ReceivedTime = email.ReceivedTime,
			From = email.From.Select(a => new ListEmailsResponse.Address
			{
				EmailAddress = a.EmailAddress,
				Name = a.Name
			}),
			To = email.To.Select(a => new ListEmailsResponse.Address
			{
				EmailAddress = a.EmailAddress,
				Name = a.Name
			}),
			Attachments = email.Attachments.Select(att => new ListEmailsResponse.Attachment
			{
				FileName = att.FileName,
				ContentType = att.ContentType
			})
		}));
	}


	[HttpGet("{providerName}/download-attachment")]
	public async Task<IActionResult> DownloadAttachment(string providerName, [FromQuery] string messageId, [FromQuery] string fileName)
	{
		if (!_registry.TryGetProvider(providerName, out var provider))
		{
			return BadRequest(new { error = $"Unknown provider: {providerName}" });
		}

		if (!TryGetAuthContextFromCookies(providerName, out var auth))
		{
			return Unauthorized();
		}

		var attachment = await provider.DownloadAttachmentAsync(auth, messageId, fileName);
		if (attachment == null) return NotFound();

		return File(attachment.Stream, "application/octet-stream", fileName);
	}


	[HttpPost("{providerName}/create-archive-item-from-emails")]
	public async Task<IActionResult> CreateArchiveItemFromEmails(string providerName, [FromBody] CreateArchiveItemFromEmailsRequest request)
	{
		if (!_registry.TryGetProvider(providerName, out var provider))
		{
			return BadRequest(new { error = $"Unknown provider: {providerName}" });
		}

		if (!TryGetAuthContextFromCookies(providerName, out var auth))
		{
			return Unauthorized();
		}

		if (request.MessageIds == null || !request.MessageIds.Any())
		{
			return NoContent();
		}

		//TODO: Implement this method
		// - Get the emails by their IDs, create an ArchiveItem and store it in the database
		// - Set the email info on the ArchiveItem (subject, date, from, to, body, etc)
		// - Get the attachments for the emails add them to the ArchiveItem as well

		throw new NotImplementedException();

		return NoContent();
	}


	[HttpPost("{providerName}/create-blobs-from-attachments")]
	public async Task<IActionResult> CreateBlobsFromAttachments(string providerName, [FromBody] CreateBlobsFromAttachmentsRequest request)
	{
		if (!_registry.TryGetProvider(providerName, out var provider))
		{
			return BadRequest(new { error = $"Unknown provider: {providerName}" });
		}

		if (!TryGetAuthContextFromCookies(providerName, out var auth))
		{
			return Unauthorized();
		}

		if (request.Attachments == null || !request.Attachments.Any())
		{
			return NoContent();
		}

		foreach (var attachment in request.Attachments)
		{
			try
			{
				var downloadedAttachment = await provider.DownloadAttachmentAsync(auth, attachment.MessageId, attachment.FileName);
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
			catch (Exception ex)
			{
				Console.WriteLine($"--- Empty catch block --- {ex.Message}");
				//TODO: Why is there an empty catch here? Log error?
			}
		}

		await _dbContext.SaveChangesAsync();
		return NoContent();
	}


	private bool TryGetAuthContextFromCookies(string providerName, out AuthContext? auth)
	{
		if (!Request.Cookies.TryGetValue($"auth-{providerName}", out var authJson))
		{
			auth = null;
			return false;
		}

		auth = JsonSerializer.Deserialize<AuthContext>(authJson);
		if (auth == null)
		{
			return false;
		}
;
		return true;
	}


	#region Request and response models

	public record TokenRequestExchangeRequest
	{
		public required string Provider { get; set; }
		public string? Code { get; set; }
		public string? RedirectUri { get; set; }
		public string? Username { get; set; }
		public string? Password { get; set; }
	}


	public record DownloadAttachmentRequest
	{
		public required string MessageId { get; set; }
		public required string FileName { get; set; }
	}


	public record CreateArchiveItemFromEmailsRequest
	{
		public List<string>? MessageIds { get; set; }
	}


	public record CreateBlobsFromAttachmentsRequest
	{
		public List<Attachment>? Attachments { get; set; }

		public class Attachment
		{
			public required string MessageId { get; set; }
			public required string FileName { get; set; }
		}
	}


	public record DownloadAttachmentResponse
	{
		public required Stream Stream { get; set; }
		public required string ContentType { get; set; }
		public required long FileSize { get; set; }
	}


	public record AuthUrlResponse
	{
		public required string State { get; set; }
		public required string Url { get; set; }
	}


	public record ListEmailsResponse
	{
		public string UniqueId { get; set; } = string.Empty;
		public string Subject { get; set; } = string.Empty;
		public string Body { get; set; } = string.Empty;
		public string HtmlBody { get; set; } = string.Empty;
		public DateTimeOffset ReceivedTime { get; set; }
		public IEnumerable<Address> From { get; set; } = [];
		public IEnumerable<Address> To { get; set; } = [];
		public IEnumerable<Attachment> Attachments { get; set; } = [];

		public record Address
		{
			public required string EmailAddress { get; set; }
			public string? Name { get; set; }
		}

		public record Attachment
		{
			public required string FileName { get; set; }
			public required string ContentType { get; set; }
		}
	}


	public class ListEmailsRequest : EmailSearchCriteria
	{
		// public required string Provider { get; set; }
	}

	#endregion
}