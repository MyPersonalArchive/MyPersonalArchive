using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;

[ApiController]
[Route("api/[controller]")]
public class BackupController : ControllerBase
{

    [HttpPost("storetabledataa")]
    public async Task<IActionResult> StoreTableData([FromBody] BackupTableData payload)
    {
        var folderPath = $"/data/backup/{payload.TenantId}/database";
        if (!Directory.Exists(folderPath))
        {
            Directory.CreateDirectory(folderPath);
        }

        var filePath = folderPath + $"/{payload.Name}";

        var json = JsonConvert.SerializeObject(payload);
        await System.IO.File.WriteAllTextAsync(filePath, json);

        return Ok();
    }

    [HttpGet("restoretabledata")]
    public async Task<IActionResult> RestoreTableDta(int tenantId, string name)
    {
        var folderPath = $"/data/backup/{tenantId}/database/";
        var json = await System.IO.File.ReadAllTextAsync(folderPath + name);
        var payload = JsonConvert.DeserializeObject<BackupTableData>(json);

        return Ok(payload);
    }

    [HttpPost("storeblob")]
    public async Task<IActionResult> Store([FromBody] BackupPayload payload)
    {
        Console.WriteLine(payload);

        var json = JsonConvert.SerializeObject(payload);

        var folderPath = $"/data/backup/{payload.File.TenantId}/blobs";
        if (!Directory.Exists(folderPath))
        {
            Directory.CreateDirectory(folderPath);
        }

        var filePath = folderPath + $"/{payload.File.FileId}";
        if (!payload.Replace && System.IO.File.Exists(filePath))
        {
            return Ok();
        }

        await System.IO.File.WriteAllTextAsync(folderPath + $"/{payload.File.FileId}", json);

        return Ok();
    }

    [HttpGet("restoreblob")]
    public async Task<IActionResult> Restore(int tenantId, Guid fileId)
    {
        var json = await System.IO.File.ReadAllTextAsync($"/data/backup/{tenantId}/blobs/{fileId}");
        var payload = JsonConvert.DeserializeObject<BackupPayload>(json);

        return Ok(payload);
    }


}