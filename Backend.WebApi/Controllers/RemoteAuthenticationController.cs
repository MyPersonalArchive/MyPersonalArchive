using System.Diagnostics;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Cryptography;
using Backend.EmailIngestion;


namespace Backend.WebApi.Controllers;

[ApiController]
[Route("api/[Controller]")]
[Authorize]
public class RemoteAuthenticationController : ControllerBase
{
	private readonly string _baseurl;
	private readonly string _clientId;
	private readonly string _clientSecret;
	
	private readonly CookieOptions _secureCookieOptions = new()
	{
		HttpOnly = true,
		Secure = true,
		SameSite = SameSiteMode.Lax,
		IsEssential = true
	};


	public RemoteAuthenticationController(IConfiguration config)
	{
		_baseurl = "https://accounts.google.com/o/oauth2/v2/auth";
		_clientId = config["Google:ClientId"]!;
		_clientSecret = config["Google:ClientSecret"]!;
	}


	[HttpGet("start-authentication")]
	public IActionResult StartAuthentication([FromQuery(Name = "provider-name")] string providerName, [FromQuery(Name = "return-url")] string returnUrl)
	{
		//TODO:
		// 1. try to get an accesstoken from the refreshtoken
		// 2. if successful, return the accesstoken
		// 3. if unsuccessful, redirect to the provider's authorization endpoint

		//TODO: providers dictionary - config or database?

		if (providerName == "gmail")
		{
			var nonce = GenerateNonce();
			HttpContext.Response.Cookies.Append($"{providerName}-nonce", nonce, _secureCookieOptions);

			var callbackUrl = Url.Action(
									"CallbackFromProvider",
									"RemoteAuthentication",
									new { },
									Request.Scheme
								)!;

			var state = new AuthState
			{
				Provider = providerName,
				Nonce = nonce,
				ReturnUrl = returnUrl
			};

			var redirectUrl = $"{_baseurl}" +
				"?response_type=code" +
				$"&client_id={Uri.EscapeDataString(_clientId)}" +
				$"&redirect_uri={Uri.EscapeDataString(callbackUrl)}" +
				$"&scope={Uri.EscapeDataString("https://mail.google.com/ https://www.googleapis.com/auth/userinfo.email")}" +
				"&access_type=offline" +
				"&prompt=consent" +
				$"&state={Uri.EscapeDataString(JsonSerializer.Serialize(state))}";

			return Redirect(redirectUrl);
		}
		else
		{
			return BadRequest($"Unknown provider: {providerName}");
		}
	}


	[HttpGet("callback")]
	public async Task<IActionResult> CallbackFromProvider([FromQuery(Name = "state")] string encodedState, [FromQuery] string code)
	{
		var state = JsonSerializer.Deserialize<AuthState>(Uri.UnescapeDataString(encodedState));
		if (state == null)
		{
			return BadRequest("Invalid state");
		}

		if (!HttpContext.Request.Cookies.TryGetValue($"{state.Provider}-nonce", out var nonce))
		{
			return BadRequest("Missing nonce cookie");
		}

		if (nonce != state.Nonce)
		{
			return BadRequest("Invalid nonce");
		}

		HttpContext.Response.Cookies.Append($"{state.Provider}-nonce", " ", _secureCookieOptions);

		if (string.IsNullOrEmpty(code))
		{
			return BadRequest("Missing code");
		}

		//TODO: How can I know the account the user selected? email address?

		//TODO: Exchange code for token, store tokens, etc.

		var callbackUrl = Url.Action(
								"CallbackFromProvider",
								"RemoteAuthentication",
								new { },
								Request.Scheme
							)!;

		using var client = new HttpClient();
		var resp = await client.PostAsync("https://oauth2.googleapis.com/token",
			new FormUrlEncodedContent(new Dictionary<string, string>
			{
				["code"] = code,
				["client_id"] = _clientId,
				["client_secret"] = _clientSecret,
				["redirect_uri"] = callbackUrl,
				["grant_type"] = "authorization_code"
			})
		);

		resp.EnsureSuccessStatusCode();
		var json = JsonDocument.Parse(await resp.Content.ReadAsStringAsync()).RootElement;

		///TODO: Should this be stored on server or in a cookie?
		var authContext = new OAuthContext
		{
			AccessToken = json.GetProperty("access_token").GetString()!,
			RefreshToken = json.GetProperty("refresh_token").GetString(),
			ExpiresAt = DateTime.UtcNow.AddSeconds(json.GetProperty("expires_in").GetInt32())
		};

		IAuthContext authCookie = authContext;

		Response.Cookies.Append(
				$"auth-{state.Provider}",
				JsonSerializer.Serialize(authCookie),
				_secureCookieOptions
			);

		return Redirect(state.ReturnUrl);
	}


	private string GenerateNonce()
	{
		byte[] randomBytes = new byte[32];
		using (var rng = RandomNumberGenerator.Create())
		{
			rng.GetBytes(randomBytes);
		}
		return Convert.ToBase64String(randomBytes);
	}


	class AuthState
	{
		public required string Provider { get; set; }
		public required string Nonce { get; set; }
		public required string ReturnUrl { get; set; }
	}
}