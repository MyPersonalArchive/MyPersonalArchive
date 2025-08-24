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
    private readonly IBackupProvider _backupProvider;
    private readonly AmbientDataResolver _ambientDataResolver;
    private readonly IOptions<AppConfig> _config;
    private readonly string _backupFolder;

    public BackupController(TenantBackupManager tenantBackupManager, IBackupProvider backupClient, AmbientDataResolver ambientDataResolver, IOptions<AppConfig> config)
    {
        _tenantBackupManager = tenantBackupManager;
        _backupProvider = backupClient;
        _ambientDataResolver = ambientDataResolver;
        _config = config;
        _backupFolder = _config.Value.BackupFolder;
    }

    [HttpPost("startbackup")]
    public IActionResult StartBackup()
    {
        _tenantBackupManager.StartTenant(_ambientDataResolver.GetCurrentTenantId()!.Value, TimeSpan.FromMinutes(5));
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

    [HttpGet("restore")]
    public IActionResult Restore([FromQuery] int tenantId, [FromQuery] string name)
    {
        var folderPath = $"{_backupFolder}/{tenantId}";
        using var fileStream = new FileStream($"{folderPath}/{name}", FileMode.Open);

        return File(fileStream, "application/zip", name);
    }
}
