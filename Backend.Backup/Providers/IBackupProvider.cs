using System.Net.Http.Headers;
using Newtonsoft.Json;

namespace Backend.Core.Providers;

public interface IBackupProvider
{
	string Name { get; }
    Task Connect(string address);
    Task BackupAsync(int tenantId, string name, Stream fileStream);
	Task<List<string>> DeleteBackupsAsync(int tenantId);
    IAsyncEnumerable<(string name, Stream stream)> RestoreAsync(int tenantId, Action<int>? totalFilesCallback = null);
}

public class BuddyTargetBackupProvider : IBackupProvider
{
    private HttpClient _httpClient;

    public string Name => "BuddyTarget";

    public Task Connect(string address)
    {
        _httpClient = new HttpClient
        {
            BaseAddress = new Uri(address)
        };

        return Task.CompletedTask;
    }

    public async Task BackupAsync(int tenantId, string name, Stream fileStream)
    {
        fileStream.Position = 0;
        var content = new StreamContent(fileStream);
        content.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
        await _httpClient.PostAsync($"/api/Backup/backup?tenantId={tenantId}&name={name}", content);
    }

    public async IAsyncEnumerable<(string name, Stream stream)> RestoreAsync(int tenantId, Action<int>? totalFilesCallback = null)
    {
        var listResponse = await _httpClient.GetAsync($"/api/Backup/list?tenantId={tenantId}");
        var responseBody = await listResponse.Content.ReadAsStringAsync();
        var list = JsonConvert.DeserializeObject<string[]>(responseBody);
        
        // Notify caller of total file count
        totalFilesCallback?.Invoke(list?.Length ?? 0);

        foreach (var name in list)
        {
            var response = await _httpClient.GetAsync($"/api/Backup/restore?tenantId={tenantId}&name={name}");
            

            var stream = await response.Content.ReadAsStreamAsync();
            stream.Position = 0;
            yield return (name, stream);
        }
    }

	public async Task<List<string>> DeleteBackupsAsync(int tenantId)
	{
		var response = await _httpClient.DeleteAsync($"/api/Backup/delete-target-backup?tenantId={tenantId}");
		var responseBody = await response.Content.ReadAsStringAsync();
		return JsonConvert.DeserializeObject<List<string>>(responseBody);
	}
}
