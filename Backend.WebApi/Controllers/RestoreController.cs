using Backend.Backup;
using Backend.Core.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace Backend.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RestoreController : ControllerBase
{
    private readonly TenantRestoreManager _tenantRestoreManager;
    private readonly IAmbientDataResolver _ambientDataResolver;

    public RestoreController(TenantRestoreManager tenantRestoreManager, IAmbientDataResolver ambientDataResolver)
    {
        _tenantRestoreManager = tenantRestoreManager;
        _ambientDataResolver = ambientDataResolver;
    }

    [HttpPost("startrestore")]
    public bool StartRestore([FromBody] StartRestoreRequest request) 
        => _tenantRestoreManager.StartTenant(
            _ambientDataResolver.GetCurrentTenantId()!.Value, 
            request.Password, 
            request.Target);

    [HttpPost("stoprestore")]
    public bool StopRestore() => _tenantRestoreManager.StopTenant(_ambientDataResolver.GetCurrentTenantId()!.Value);

    [HttpGet("status")]
    public RestoreStatusResponse GetStatus()
    {
        var tenantId = _ambientDataResolver.GetCurrentTenantId()!.Value;
        var status = _tenantRestoreManager.GetStatus(tenantId);
        return new RestoreStatusResponse
        {
            IsRestoring = status.IsRestoring,
            Status = status.Status,
            FilesRestored = status.FilesRestored,
            TotalFiles = status.TotalFiles,
            CurrentFile = status.CurrentFile
        };
    }
}

public class StartRestoreRequest
{
    public required string Password { get; set; }
    public string? Target { get; set; }
}

public class RestoreStatusResponse
{
    public bool IsRestoring { get; set; }
    public string Status { get; set; } = "NotStarted";
    public int FilesRestored { get; set; }
    public int TotalFiles { get; set; }
    public string? CurrentFile { get; set; }
}