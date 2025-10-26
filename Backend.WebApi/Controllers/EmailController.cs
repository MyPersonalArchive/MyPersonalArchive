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

	[HttpGet("{provider}/auth/url")]
	public ActionResult<AuthUrlResponse> GetAuthUrl(string provider, [FromQuery] string redirectUri)
	{
		if (!_registry.TryGetProvider(provider, out var prov))
			return BadRequest(new { error = $"Unknown provider: {provider}" });

		if (prov.AuthenticationMode != EmailAuthMode.Oath2)
			return BadRequest(new { error = $"{provider} does not support OAuth" });

		//The random guid (nonce) should be validated on the callback on the client to verify that the state is the same
		var rawState = new
		{
			provider,
			nonce = Guid.NewGuid().ToString("N")
		};

		var stateJson = JsonSerializer.Serialize(rawState);
		var encodedState = WebUtility.UrlEncode(stateJson);

		var url = prov.GetAuthorizationUrl(encodedState, redirectUri);
		return Ok(new AuthUrlResponse { Url = url, State = encodedState });
	}

	[HttpPost("{provider}/auth/exchange")]
	public async Task<IActionResult> ExchangeToken([FromBody] TokenRequestExchangeRequest token)
	{
		if (!_registry.TryGetProvider(token.Provider, out var prov))
			return BadRequest(new { error = $"Unknown provider: {token.Provider}" });

		if (prov == null) return NotFound();

		if (prov.AuthenticationMode == EmailAuthMode.Oath2)
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
		else if (prov.AuthenticationMode == EmailAuthMode.Basic)
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

	[HttpGet("{provider}/list-folders")]

	public async Task<IActionResult> GetFolders(string provider)
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

		if (prov.AuthenticationMode == EmailAuthMode.Oath2)
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

		return Ok(await prov.GetAvailableFolders(auth));
	}



	[HttpPost("{provider}/list")]
	public async Task<ActionResult<IEnumerable<ListEmailsResponse>>> List([FromBody] ListEmailsRequest request)
	{
		if (!_registry.TryGetProvider(request.Provider, out var prov))
		{
			return BadRequest(new { error = $"Unknown provider: {request.Provider}" });

		}
		if (!Request.Cookies.TryGetValue($"auth-{request.Provider}", out var authJson))
		{
			return Unauthorized();
		}

		var auth = JsonSerializer.Deserialize<AuthContext>(authJson);

		if (auth == null)
		{
			return Unauthorized();

		}

		if (prov.AuthenticationMode == EmailAuthMode.Oath2)
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

		var emails = await prov.FindAttachmentsAsync(auth, request);
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


	[HttpGet("{provider}/download-attachment")]
	public async Task<IActionResult> DownloadAttachment(string provider, [FromQuery] string messageId, [FromQuery] string fileName)
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


		var attachment = await prov.DownloadAttachmentAsync(auth, messageId, fileName);
		if (attachment == null) return NotFound();

		return File(attachment.Stream, "application/octet-stream", fileName);
	}


	[HttpPost("{provider}/create-archive-item-from-emails")]
	public async Task<IActionResult> CreateArchiveItemFromEmails(string provider, [FromBody] CreateArchiveItemFromEmailsRequest request)
	{
		if (!_registry.TryGetProvider(provider, out var prov))
			return BadRequest(new { error = $"Unknown provider: {provider}" });

		if (!Request.Cookies.TryGetValue($"auth-{provider}", out var authJson))
		{
			return Unauthorized();
		}

		var auth = JsonSerializer.Deserialize<AuthContext>(authJson);

		if (auth == null)
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


	[HttpPost("{provider}/create-blobs-from-attachments")]
	public async Task<IActionResult> CreateBlobsFromAttachments(string provider, [FromBody] CreateBlobsFromAttachmentsRequest request)
	{
		if (!_registry.TryGetProvider(provider, out var prov))
			return BadRequest(new { error = $"Unknown provider: {provider}" });

		if (!Request.Cookies.TryGetValue($"auth-{provider}", out var authJson))
		{
			return Unauthorized();
		}

		var auth = JsonSerializer.Deserialize<AuthContext>(authJson);

		if (auth == null)
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
			catch (Exception ex)
			{
				Console.WriteLine($"--- Empty catch block --- {ex.Message}");
				//TODO: Why is there an empty catch here? Log error?
			}
		}

		await _dbContext.SaveChangesAsync();
		return NoContent();
	}


	#region Request and response models

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


	public class CreateArchiveItemFromEmailsRequest
	{
		public List<string>? MessageIds { get; set; }
	}


	public class CreateBlobsFromAttachmentsRequest
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


	public class ListEmailsResponse
	{
		public string UniqueId { get; set; } = string.Empty;
		public string Subject { get; set; } = string.Empty;
		public string Body { get; set; } = string.Empty;
		public string HtmlBody { get; set; } = string.Empty;
		public DateTimeOffset ReceivedTime { get; set; }
		public IEnumerable<Address> From { get; set; } = [];
		public IEnumerable<Address> To { get; set; } = [];
		public IEnumerable<Attachment> Attachments { get; set; } = [];

		public class Address
		{
			public required string EmailAddress { get; set; }
			public string? Name { get; set; }
		}

		public class Attachment
		{
			public required string FileName { get; set; }
			public required string ContentType { get; set; }
		}
	}


	public class ListEmailsRequest : EmailSearchCriteria
	{
		public required string Provider { get; set; }
	}

	#endregion
}