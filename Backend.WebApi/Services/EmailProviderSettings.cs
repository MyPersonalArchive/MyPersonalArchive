using Backend.Core;
using Backend.WebApi.Services.Infrastructure;
using Microsoft.Extensions.Options;
using System.Text.Json.Serialization;

namespace Backend.WebApi.Services;

[RegisterService(ServiceLifetime.Scoped)]
public class EmailProviderService : SystemSettingsServiceBase<EmailProviderSettings>
{
	protected override string FileName => "EmailProviderSettings.json";

	private readonly SignalRService _signalRService;

	public EmailProviderService(IOptions<AppConfig> config, IAmbientDataResolver resolver, SignalRService signalRService)
		: base(config, resolver)
	{
		_signalRService = signalRService;
	}

	public async Task<EmailProviderSettings> GetEmailProviderSettingsAsync()
	{
		return await LoadSettingsAsync();
	}

	public async Task StoreEmailProviderSettingsAsync(EmailProviderSettings settings)
	{
		await SaveSettingsAsync(settings);
		await _signalRService.PublishToTenantChannel(new SignalRService.Message("EmailProviderSettingsUpdated", null));
	}
}

public class EmailProviderSettings : SettingsBase
{
	public List<EmailProvider> EmailProviders { get; set; } = [];

	public class EmailProvider
	{
		public required string Name { get; set; }
		public required string DisplayName { get; set; }
		public required string ImapHost { get; set; }
		public required int ImapPort { get; set; }
		public required string SecureSocketOptions { get; set; }
		public required List<IAuthType> AuthTypes { get; set; } = [];
	}

	[JsonDerivedType(typeof(OAuthAuthType), typeDiscriminator: "oauth")]
	[JsonDerivedType(typeof(BasicAuthType), typeDiscriminator: "basic")]
	public interface IAuthType
	{
	}

	public class OAuthAuthType : IAuthType
	{
		public string Type => "oauth";
		public required string TokenEndpoint { get; set; }
		public required string AuthEndpoint { get; set; }
		public string? UserInfoEndpoint { get; set; }
		public required string ClientId { get; set; }
		public required string ClientSecret { get; set; }
		public required List<string> Scopes { get; set; } = [];
	}

	public class BasicAuthType : IAuthType
	{
		public string Type => "basic";
	}
}
