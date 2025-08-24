using System.Net.Http.Headers;
using Newtonsoft.Json;

public interface IBackupProvider
{
    Task Connect(string address);
    Task BackupAsync(int tenantId, string name, Stream fileStream);
    IAsyncEnumerable<(string name, Stream stream)> RestoreAsync(int tenantId);
}

public class BuddyTargetBackupProvider : IBackupProvider
{
    private HttpClient _httpClient;

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

    public async IAsyncEnumerable<(string name, Stream stream)> RestoreAsync(int tenantId)
    {
        var listResponse = await _httpClient.GetAsync($"/api/Backup/list?tenantId={tenantId}");
        var responseBody = await listResponse.Content.ReadAsStringAsync();
        var list = JsonConvert.DeserializeObject<string[]>(responseBody);

        foreach (var name in list)
        {
            var response = await _httpClient.GetAsync($"/api/Backup/restore?tenantId={tenantId}&name={name}");
            var stream = await response.Content.ReadAsStreamAsync();
            stream.Position = 0;
            yield return (name, stream);
        }
    }
}