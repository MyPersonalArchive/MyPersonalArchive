using System.Net.Http.Headers;

public interface IBackupProvider
{
    Task Connect(string address);
    Task BackupAsync(int tenantId, string name, Stream fileStream);
    Task<Stream> RestoreAsync(int tenantId, string name);
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

    public async Task<Stream> RestoreAsync(int tenantId, string name)
    {
        var response = await _httpClient.GetAsync($"/api/Backup/restore?tenantId={tenantId}&name={name}");
        var stream = await response.Content.ReadAsStreamAsync();
        stream.Position = 0;
        return stream;
    }
}