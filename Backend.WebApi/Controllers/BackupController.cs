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
    private readonly BackupClient _backupClient;
    private readonly AmbientDataResolver _ambientDataResolver;
    private readonly IOptions<AppConfig> _config;
    private readonly string _backupFolder;

    public BackupController(TenantBackupManager tenantBackupManager, BackupClient backupClient, AmbientDataResolver ambientDataResolver, IOptions<AppConfig> config)
    {
        _tenantBackupManager = tenantBackupManager;
        _backupClient = backupClient;
        _ambientDataResolver = ambientDataResolver;
        _config = config;
        _backupFolder = _config.Value.BackupFolder;
    }

    [HttpPost("startbackup")]
    public async Task<IActionResult> StartBackup()
    {
        _tenantBackupManager.StartTenant(_ambientDataResolver.GetCurrentTenantId()!.Value, TimeSpan.FromMinutes(5));
        return Ok();
    }

    [HttpPost("stopbackup")]
    public async Task<IActionResult> StopBackup()
    {
        _tenantBackupManager.StopTenant(_ambientDataResolver.GetCurrentTenantId()!.Value);
        return Ok();
    }


    [HttpPost("storeblob")]
    public async Task<IActionResult> StoreBlob([FromBody] BackupPayload payload)
    {
        var json = JsonConvert.SerializeObject(payload);

        var folderPath = $"{_backupFolder}/{payload.File.TenantId}/blobs";
        if (!Directory.Exists(folderPath))
        {
            Directory.CreateDirectory(folderPath);
        }

        var filePath = $"{folderPath}/{payload.File.FileId}";
        await System.IO.File.WriteAllTextAsync(filePath, json);

        return Ok();
    }

    [HttpPost("storetabledata")]
    public async Task<IActionResult> StoreTableData([FromBody] BackupTableData payload)
    {
        var folderPath = $"{_backupFolder}/{payload.TenantId}/database";
        if (!Directory.Exists(folderPath))
        {
            Directory.CreateDirectory(folderPath);
        }

        var filePath = $"{folderPath}/{payload.Name}";

        var json = JsonConvert.SerializeObject(payload);
        await System.IO.File.WriteAllTextAsync(filePath, json);

        return Ok();
    }

    //TODO: Create a complete restore method instead? Just call Restore for both database and blobs?

    [HttpGet("restoreblob")]
    public async Task<IActionResult> RestoreBlob([FromBody] Guid fileId)
    {
        await _backupClient.RestoreBlob(_ambientDataResolver.GetCurrentTenantId()!.Value, fileId);
        return Ok();
    }

    [HttpGet("restoretabledata")]
    public async Task<IActionResult> RestoreTableData([FromQuery] string name, [FromQuery] int tenantId)
    {
        await _backupClient.RestoreTableData(name, tenantId);
        return Ok();
    }
}
