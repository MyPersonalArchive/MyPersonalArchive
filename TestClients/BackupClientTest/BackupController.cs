using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;

[ApiController]
[Route("api/[controller]")]
public class BackupController : ControllerBase
{

    [HttpPost("backup")]
    public async Task<IActionResult> Backup([FromQuery] int tenantId, [FromQuery] string name)
    {
        var folderPath = $"/data/backup/{tenantId}";
        if (!Directory.Exists(folderPath))
        {
            Directory.CreateDirectory(folderPath);
        }

        var filePath = folderPath + $"/{name}";

        using var fileStream = new FileStream(filePath, FileMode.Create);
        await Request.Body.CopyToAsync(fileStream);

        return Ok();
    }

    [HttpGet("restore")]
    public async Task<IActionResult> Restore([FromQuery] int tenantId, [FromQuery] string name)
    {
        var filePath = $"/data/backup/{tenantId}/{name}";
        using var fileStream = new FileStream(filePath, FileMode.Open);
        return File(fileStream, "application/zip", name);
    }

    [HttpGet("list")]
    public async Task<IActionResult> GetList([FromQuery] int tenantId)
    {
        var folderPath = $"/data/backup/{tenantId}";
        var files = Directory.GetFiles(folderPath, "*.zip.enc").Select(Path.GetFileName).ToList();
        return Ok(files);
    }
}