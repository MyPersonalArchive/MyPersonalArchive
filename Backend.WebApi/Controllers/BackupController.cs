using Backend.Core;
using Backend.Core.Providers;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Headers;


[ApiController]
[Route("api/[controller]")]
public class BackupController : ControllerBase
{
    private readonly TenantBackupManager _tenantBackupManager;
    private readonly AmbientDataResolver _ambientDataResolver;

    public BackupController(TenantBackupManager tenantBackupManager, AmbientDataResolver ambientDataResolver)
    {
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


    [HttpPost("storeblob")]
    public async Task<IActionResult> StoreBlob([FromBody] BackupPayload payload)
    {
        return Ok();
    }

    [HttpGet("restoreblob")]
    public async Task<IActionResult> RestoreBlob([FromBody] Guid fileId)
    {
        return Ok();
    }

    [HttpGet("restoretabledata")]
    public async Task<IActionResult> RestoreTableData([FromQuery] string name, [FromQuery] int tenantId)
    {
        //Restore table data and insert whats missing
        return Ok();
    }
}
