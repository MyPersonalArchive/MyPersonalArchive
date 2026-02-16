using System.Text.Json;
using Backend.Core;
using Microsoft.Extensions.Options;

namespace Backend.WebApi.Services.Infrastructure;

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
		return JsonSerializer.Deserialize<T>(json, JsonSerializerOptions.Web) ?? new T { SchemaVersion = "1.0" };
	}

	protected async Task SaveSettingsAsync(T settings)
	{
		if (!Directory.Exists(GetSettingsPath()))
		{
			Directory.CreateDirectory(GetSettingsPath());
		}
		var path = Path.Combine(GetSettingsPath(), FileName);

		var json = JsonSerializer.Serialize(settings, JsonSerializerOptions.Web);
		await File.WriteAllTextAsync(path, json);
	}

	protected async Task ChangeSettingsAsync(Func<T, T> changeDelegate)
	{
		// TODO: we should probably have some locking mechanism here to prevent race conditions
		// Simple locking does not compile here because the method is async

		// lock (this)
		// {
		var fromSettings = await LoadSettingsAsync();
		var toSettings = changeDelegate(fromSettings);
		await SaveSettingsAsync(toSettings);
		// }
	}

}
