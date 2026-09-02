using System.Text.Json;
using Backend.Core.Infrastructure;
using Backend.Core.Providers.Store;

namespace Backend.Core.Services.Infrastructure;

public abstract class SettingsServiceBase<T> where T : SettingsBase, new()
{
	// protected readonly IAmbientDataResolver Resolver;
	private readonly IFileStore _fileStore;

	protected abstract string FileName { get; }

	protected SettingsServiceBase(IFileStore fileStore)
	{
		_fileStore = fileStore;

	}

	protected async Task<T> LoadSettingsAsync()
	{
		if (!await _fileStore.FileExists([], FileName))
		{
			return await InitializeAsync();
		}

		await using var stream = await _fileStore.GetFile([], FileName) ?? throw new InvalidOperationException($"Unable to obtain stream for {FileName}.");
		return JsonSerializer.Deserialize<T>(stream, JsonSerializerDefaults.Options) ?? new T { SchemaVersion = "1.0" };
	}

	protected async Task SaveSettingsAsync(T settings)
	{
		await using var fileStream = await _fileStore.GetWritableFileStream([], FileName);
		await JsonSerializer.SerializeAsync(fileStream, settings, JsonSerializerDefaults.Options);
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


	protected virtual async Task<T> InitializeAsync()
	{
		return new T { SchemaVersion = "1.0" };
	}
}
