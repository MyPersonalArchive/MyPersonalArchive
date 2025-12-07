using Backend.Core;
using Microsoft.AspNetCore.Mvc;

namespace Backend.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RestoreController : ControllerBase
{
    private readonly TenantRestoreManager _tenantRestoreManager;
    private readonly AmbientDataResolver _ambientDataResolver;

    public RestoreController(TenantRestoreManager tenantRestoreManager, AmbientDataResolver ambientDataResolver)
    {
        _tenantRestoreManager = tenantRestoreManager;
        _ambientDataResolver = ambientDataResolver;
    }

    [HttpPost("startrestore")]
    public bool StartRestore([FromBody] string password) => _tenantRestoreManager.StartTenant(_ambientDataResolver.GetCurrentTenantId()!.Value, password);

    [HttpPost("stoprestore")]
    public bool StopRestore() => _tenantRestoreManager.StopTenant(_ambientDataResolver.GetCurrentTenantId()!.Value);
}