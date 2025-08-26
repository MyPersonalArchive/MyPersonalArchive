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

    [HttpGet("list")]
    public IActionResult GetList([FromQuery] int tenantId)
    {
        var folderPath = $"/data/backup/{tenantId}";
        var files = Directory.GetFiles(folderPath, "*.zip.enc").Select(Path.GetFileName).ToList();
        return Ok(files);
    }
}