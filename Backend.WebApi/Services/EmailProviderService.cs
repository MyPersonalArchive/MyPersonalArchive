using Backend.Core;
using Backend.Core.Infrastructure;
using Backend.Core.Services;
using Backend.Core.Services.Infrastructure;
using Microsoft.Extensions.Options;
using System.Text.Json.Serialization;

namespace Backend.WebApi.Services;

[RegisterService(ServiceLifetime.Scoped)]
public class EmailProviderService : SystemSettingsServiceBase<EmailProviderSettings>
{
	protected override string FileName => "EmailProviderSettings.json";

	private readonly ISignalRService _signalRService;

	public EmailProviderService(IOptions<AppConfig> config, IAmbientDataResolver resolver, ISignalRService signalRService)
		: base(config, resolver)
	{
		_signalRService = signalRService;
	}

	public async Task<EmailProviderSettings> GetEmailProviderSettingsAsync()
	{
		return await LoadSettingsAsync();
	}

}


public class EmailProviderSettings : SettingsBase
{
	public List<EmailProvider> EmailProviders { get; set; } = [];

	public class EmailProvider
	{
		public required string Provider { get; set; }
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
		public string Type { get; }
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


public static class EmailProviderSettingsQueryExtensions{
	extension(EmailProviderSettings settings)
	{
		public EmailProviderSettings.EmailProvider GetEmailProvider(string providerName)
		{
			return settings.EmailProviders.FirstOrDefault(p => p.Provider == providerName) ?? throw new Exception("Unknown email provider");
		}

		public EmailProviderSettings.IAuthType GetAuthType(string providerName, string authType)
		{
			var emailProvider = settings.GetEmailProvider(providerName);
			return emailProvider.AuthTypes.FirstOrDefault(a => a.Type == authType) ?? throw new Exception("Unknown auth type");
		}
	}
}