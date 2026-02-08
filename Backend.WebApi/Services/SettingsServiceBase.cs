using Backend.Core;
using Microsoft.Extensions.Options;

namespace Backend.WebApi.Services;

public abstract class SettingsServiceBase<T> where T : SettingsBase, new()
{
	protected readonly string SettingsFolder;
	protected readonly IAmbientDataResolver Resolver;


	protected abstract string FileName { get; }

	public SettingsServiceBase(IOptions<AppConfig> config, IAmbientDataResolver resolver)
	{
		SettingsFolder = config.Value.SettingsFolder;
		Resolver = resolver;
	}

	protected abstract string GetSettingsPath();


	protected async Task<T> LoadSettingsAsync()
	{
		var filePath = Path.Combine(GetSettingsPath(), FileName);
		if (!File.Exists(filePath))
		{
			return new T { SchemaVersion = "1.0" };
		}

		var json = await File.ReadAllTextAsync(filePath);
		return System.Text.Json.JsonSerializer.Deserialize<T>(json) ?? new T { SchemaVersion = "1.0" };
	}

	protected async Task SaveSettingsAsync(T settings)
	{
		if (!Directory.Exists(GetSettingsPath()))
		{
			Directory.CreateDirectory(GetSettingsPath());
		}
		var path = Path.Combine(GetSettingsPath(), FileName);

		var json = System.Text.Json.JsonSerializer.Serialize(settings, new System.Text.Json.JsonSerializerOptions
		{
			WriteIndented = true
		});
		await File.WriteAllTextAsync(path, json);
	}
}


public abstract class TenantSettingsServiceBase<T> : SettingsServiceBase<T> where T : SettingsBase, new()
{
	protected TenantSettingsServiceBase(IOptions<AppConfig> config, IAmbientDataResolver resolver)
		: base(config, resolver)
	{
	}

	protected override string GetSettingsPath()
	{
		var tenantId = Resolver.GetCurrentTenantId() ?? throw new Exception("Cannot get tenantsettings file path without a tenant context");
		return Path.Combine(SettingsFolder, tenantId.ToString());
	}
}


public abstract class UserSettingsServiceBase<T> : SettingsServiceBase<T> where T : SettingsBase, new()
{
	protected UserSettingsServiceBase(IOptions<AppConfig> config, IAmbientDataResolver resolver)
		: base(config, resolver)
	{
	}

	protected override string GetSettingsPath()
	{
		var tenantId = Resolver.GetCurrentTenantId() ?? throw new Exception("Cannot get user settings file path without a tenant context");
		var userName = Resolver.GetCurrentUsername() ?? throw new Exception("Cannot get user settings file path without a user context");
		return Path.Combine(SettingsFolder, tenantId.ToString(), userName.ToString());
	}
}



public abstract class SettingsBase
{
	public string SchemaVersion { get; set; }
}