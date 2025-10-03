using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

[ApiController]
[Route("api/[controller]")]
public class EmailIngestionController : ControllerBase
{
    private readonly EmailIngestionProviderFactory _registry;

    public EmailIngestionController(EmailIngestionProviderFactory registry)
    {
        _registry = registry;
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
        return Ok(new { url, state });
    }

    [HttpPost("{provider}/auth/exchange")]
    public async Task<IActionResult> ExchangeToken(string provider, [FromBody] JsonElement body)
    {
        var prov = _registry.Get(provider);
        if (prov == null) return NotFound();

        if (!body.TryGetProperty("code", out var codeEl))
            return BadRequest(new { error = "missing code" });

		if(!body.TryGetProperty("redirectUri", out var redirectUriEl))
			return BadRequest(new { error = "missing redirectUri" });

		var redirectUri = redirectUriEl.GetString();
		var code = codeEl.GetString();
        var tokens = await prov.ExchangeCodeForTokenAsync(code!, redirectUri!);
        return Ok(tokens);
    }

    [HttpPost("{provider}/find-attachments")]
    public async Task<IActionResult> FindAttachments(string provider, [FromBody] JsonElement body)
    {
        if (!_registry.TryGetProvider(provider, out var prov))
            return BadRequest(new { error = $"Unknown provider: {provider}" });

        AuthContext auth;
        if (prov.AuthenticationMode == EmailIngestionAuthMode.Oath2)
        {
            if (!body.TryGetProperty("accessToken", out var at))
                return BadRequest(new { error = "missing access_token" });

            var refresh = body.TryGetProperty("refreshToken", out var rt) ? rt.GetString() : null;
            auth = AuthContext.FromOAuth(at.GetString()!, refresh);
        }
        else
        {
            if (!body.TryGetProperty("username", out var u) ||
                !body.TryGetProperty("password", out var p))
                return BadRequest(new { error = "missing username/password" });

            auth = AuthContext.FromBasic(u.GetString()!, p.GetString()!);
        }

        var results = await prov.FindAttachmentsAsync(auth);
        return Ok(new { attachments = results });
    }

    [HttpPost("{provider}/download-attachment")]
    public async Task<IActionResult> DownloadAttachment(string provider, [FromBody] JsonElement body)
    {
        if (!_registry.TryGetProvider(provider, out var prov))
            return BadRequest(new { error = $"Unknown provider: {provider}" });

        AuthContext auth = prov.AuthenticationMode == EmailIngestionAuthMode.Oath2
            ? AuthContext.FromOAuth(body.GetProperty("accessToken").GetString()!)
            : AuthContext.FromBasic(
                body.GetProperty("username").GetString()!,
                body.GetProperty("password").GetString()!
            );

        var messageId = body.GetProperty("messageId").GetString()!;
        var fileName = body.GetProperty("fileName").GetString()!;

        var stream = await prov.DownloadAttachmentAsync(auth, messageId, fileName);
        if (stream == null) return NotFound();

        return File(stream, "application/octet-stream", fileName);
    }
}
