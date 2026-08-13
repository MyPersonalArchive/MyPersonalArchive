using Backend.Mpa.Core.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

[ApiController]
[Route("api/[Controller]/[Action]")]
[Authorize(Policy = "TenantIdPolicy")]
public class BackupController : ControllerBase
{
	private readonly BackupQueryService _backupQueryService;

	public BackupController(BackupQueryService backupQueryService)
	{
		_backupQueryService = backupQueryService;
	}

	public async Task<ActionResult> DownloadArchive()
	{
		var (zipStream, filename) = await _backupQueryService.CreateTenantArchiveZipAsync();
		return File(zipStream, "application/zip", filename);
	}
}