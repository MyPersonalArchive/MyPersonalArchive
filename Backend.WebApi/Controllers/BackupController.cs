using Backend.Core;
using Backend.Core.Providers;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Headers;


[ApiController]
[Route("api/[controller]")]
public class BackupController : ControllerBase
{
    private readonly IBackupStore _backupStore;
    private readonly TenantBackupManager _tenantBackupManager;
    private readonly AmbientDataResolver _ambientDataResolver;

    public BackupController(IBackupStore backupStore, TenantBackupManager tenantBackupManager, AmbientDataResolver ambientDataResolver)
    {
        _backupStore = backupStore;
        _tenantBackupManager = tenantBackupManager;
        _ambientDataResolver = ambientDataResolver;
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


    [HttpPost("store")]
    public async Task<IActionResult> Store([FromBody] BackupPayload payload)
    {
        await _backupStore.SaveAsync(payload);
        return Ok();
    }

    [HttpGet("restore")]
    public async Task<IActionResult> Restore([FromBody] Guid fileId)
    {
        var payload = await _backupStore.GetAsync(fileId);
        return Ok(payload);
    }
}
