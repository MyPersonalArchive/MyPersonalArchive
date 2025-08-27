using Backend.Core;
using Backend.Core.Providers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using System.Net.Http.Headers;


[ApiController]
[Route("api/[controller]")]
public class BackupController : ControllerBase
{
    private readonly TenantBackupManager _tenantBackupManager;
    private readonly AmbientDataResolver _ambientDataResolver;
    private readonly BackupProviderFactory _backupProviderFactory;
    private readonly EncryptionProviderFactory _encryptionProviderFactory;
    private readonly IOptions<AppConfig> _config;
    private readonly string _backupFolder;

    public BackupController(TenantBackupManager tenantBackupManager,
                            AmbientDataResolver ambientDataResolver,
                            BackupProviderFactory backupProviderFactory,
                            EncryptionProviderFactory encryptionProviderFactory,
                            IOptions<AppConfig> config)
    {
        _tenantBackupManager = tenantBackupManager;
        _ambientDataResolver = ambientDataResolver;
        _backupProviderFactory = backupProviderFactory;
        _encryptionProviderFactory = encryptionProviderFactory;
        _config = config;
        _backupFolder = _config.Value.BackupFolder;
    }

    [HttpPost("setbackupprovider")]
    public void SetBackupProvider([FromQuery] string providerName) => _backupProviderFactory.SetProvider(providerName);

    [HttpPost("setencryptionprovider")]
    public void SetEncryptionProvider([FromQuery] string providerName) => _encryptionProviderFactory.SetProvider(providerName);

    [HttpPost("startbackup")]
    public IActionResult StartBackup([FromBody] string password)
    {
        _tenantBackupManager.StartTenant(_ambientDataResolver.GetCurrentTenantId()!.Value, TimeSpan.FromMinutes(5), password);
        return Ok();
    }

    [HttpPost("stopbackup")]
    public IActionResult StopBackup()
    {
        _tenantBackupManager.StopTenant(_ambientDataResolver.GetCurrentTenantId()!.Value);
        return Ok();
    }

    [HttpGet("BackupInformation")]
    public IActionResult BackupInformation()
    {
        var data = _tenantBackupManager.GetBackupInformation(_ambientDataResolver.GetCurrentTenantId()!.Value);
        return Ok(new
        {
            Status = data?.Status,
            LastBackupTime = data?.LastBackupTime,
            NextBackupTime = data?.NextBackupTime
        });
    }


    [HttpPost("backup")]
    public async Task<IActionResult> Backup([FromQuery] int tenantId, [FromQuery] string name)
    {
        var folderPath = $"{_backupFolder}/{tenantId}";

        using var memoryStream = new MemoryStream();
        await Request.Body.CopyToAsync(memoryStream);
        memoryStream.Position = 0;

        using var fileStream = new FileStream($"{folderPath}/{name}.zip.enc", FileMode.Create);
        await memoryStream.CopyToAsync(fileStream);

        return Ok();
    }

    [HttpGet("list")]
    public IActionResult GetList([FromQuery] int tenantId)
    {
        var folderPath = $"{_backupFolder}/{tenantId}";
        var files = Directory.GetFiles(folderPath, "*.zip.enc").Select(Path.GetFileName).ToList();
        return Ok(files);
    }


    [HttpGet("restore")]
    public IActionResult Restore([FromQuery] int tenantId, [FromQuery] string name)
    {
        try
        {
            var filePath = $"/data/backup/{tenantId}/{name}";
            if (!System.IO.File.Exists(filePath))
            {
                return NotFound($"Backup file for tenant {tenantId} with name {name} not found.");
            }

            var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);
            return File(fileStream, "application/zip", name);
        }
        catch (IOException ex)
        {
            return StatusCode(500, $"IO error while accessing file: {ex.Message}");
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Unexpected error: {ex.Message}");
        }
    }
}
