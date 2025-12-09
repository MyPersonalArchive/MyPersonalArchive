using Backend.Core;
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
    public bool StartRestore([FromBody] string password) => _tenantRestoreManager.StartTenant(_ambientDataResolver.GetCurrentTenantId()!.Value, password);

    [HttpPost("stoprestore")]
    public bool StopRestore() => _tenantRestoreManager.StopTenant(_ambientDataResolver.GetCurrentTenantId()!.Value);
}