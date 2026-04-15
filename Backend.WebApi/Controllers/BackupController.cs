using Backend.Backup;
using Backend.Core;
using Backend.Core.Infrastructure;
using Backend.Core.Services;
using Backend.DbModel.Database;
using Backend.WebApi.SignalR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Backend.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BackupController : ControllerBase
{
    private readonly TenantBackupManager _tenantBackupManager;
    private readonly IAmbientDataResolver _ambientDataResolver;
    private readonly BackupProviderFactory _backupProviderFactory;
    private readonly EncryptionProviderFactory _encryptionProviderFactory;
    private readonly BackupLogFileService _logFileService;
    private readonly IOptions<AppConfig> _config;
    private readonly string _backupFolder;
    private readonly MpaDbContext _dbContext;

    public BackupController(TenantBackupManager tenantBackupManager,
                            IAmbientDataResolver ambientDataResolver,
                            BackupProviderFactory backupProviderFactory,
                            EncryptionProviderFactory encryptionProviderFactory,
                            BackupLogFileService logFileService,
                            IOptions<AppConfig> config,
                            MpaDbContext dbContext)
    {
        _tenantBackupManager = tenantBackupManager;
        _ambientDataResolver = ambientDataResolver;
        _backupProviderFactory = backupProviderFactory;
        _encryptionProviderFactory = encryptionProviderFactory;
        _logFileService = logFileService;
        _config = config;
        _backupFolder = _config.Value.BackupFolder;
        _dbContext = dbContext;
    }

    [HttpPost("startbackup")]
    public async Task<ActionResult<object>> StartBackup([FromBody] BackupRequest request) 
	{
        if (string.IsNullOrEmpty(request.Target))
		{
			return BadRequest("Target must be provided");
		}

		if(string.IsNullOrEmpty(request.ProviderName))
		{
			return BadRequest("ProviderName must be provided");
		}

		if(string.IsNullOrEmpty(request.EncryptionMode))
		{
			return BadRequest("EncryptionMode must be provided");
		}

		_backupProviderFactory.SetProvider(request.ProviderName);
		_encryptionProviderFactory.SetProvider(request.EncryptionMode);
    
        var result = _tenantBackupManager.StartTenant(request.Target, _ambientDataResolver.GetCurrentTenantId()!.Value, request.Password);
        if (result)
        {
            return NoContent();
        }
        else
        {
            // Notify frontend that backup failed to start
            var signalRService = HttpContext.RequestServices.GetRequiredService<ISignalRService>();
            await signalRService.PublishToTenantChannel(
                new ISignalRService.Message("BackupFailed", new { Error = "Backup is already running for this tenant", Target = request.Target })
            );
            return BadRequest("Backup is already running for this tenant");
        }
    }

    [HttpPost("stopbackup")]
    public ActionResult<object> StopBackup()
    {
        _tenantBackupManager.StopTenant(_ambientDataResolver.GetCurrentTenantId()!.Value);
        return NoContent();
    }

    [HttpPost("set-backup-interval")]
    public async Task<ActionResult> SetBackupInterval([FromBody] SetBackupIntervalRequest request)
    {
        var tenantId = _ambientDataResolver.GetCurrentTenantId()!.Value;
        
        if (request.IntervalMinutes < 1)
        {
            return BadRequest("Interval must be at least 1 minute");
        }

        var configFilePath = Path.Combine(_backupFolder, $"backup-config-tenant-{tenantId}.json");
        var config = new TenantBackupConfig
        {
            TenantId = tenantId,
            IntervalMinutes = request.IntervalMinutes,
            LastUpdated = DateTime.UtcNow
        };

        var json = JsonConvert.SerializeObject(config, Formatting.Indented);
        await System.IO.File.WriteAllTextAsync(configFilePath, json);

        return NoContent();
    }

    [HttpGet("get-backup-interval")]
    public async Task<ActionResult<TenantBackupConfig>> GetBackupInterval()
    {
        var tenantId = _ambientDataResolver.GetCurrentTenantId()!.Value;
        var configFilePath = Path.Combine(_backupFolder, $"backup-config-tenant-{tenantId}.json");

        if (!System.IO.File.Exists(configFilePath))
        {
            // Return default config
            return Ok(new TenantBackupConfig
            {
                TenantId = tenantId,
                IntervalMinutes = 1440, // 24 hours default
                LastUpdated = DateTime.UtcNow
            });
        }

        var json = await System.IO.File.ReadAllTextAsync(configFilePath);
        var config = JsonConvert.DeserializeObject<TenantBackupConfig>(json);
        return Ok(config);
    }

    [HttpGet("BackupInformation")]
    public IActionResult BackupInformation()
    {
        var data = _tenantBackupManager.GetBackupInformation(_ambientDataResolver.GetCurrentTenantId()!.Value);
        return Ok(new
        {
            data?.Status,
            data?.LastBackupTime,
            data?.NextBackupTime
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

        return NoContent();
    }

    [HttpGet("list")]
    public IActionResult GetList([FromQuery] int tenantId)
    {
        var folderPath = $"{_backupFolder}/{tenantId}";
        var files = Directory.GetFiles(folderPath, "*.zip.enc").Select(Path.GetFileName).ToList();
        return Ok(files);
    }


	[HttpDelete("delete-target-backup")]
    public async Task<ActionResult<List<string>>> Delete(string target)
    {
        var tenantId = _ambientDataResolver.GetCurrentTenantId()!.Value;
    
		try
		{
			var deletedFiles = await _tenantBackupManager.DeleteRemoteBackupsAsync(tenantId, target);
			return Ok(deletedFiles);
		}
		catch (Exception ex)
		{
			return StatusCode(500, $"Failed to delete remote backups: {ex.Message}");
		}
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

    [HttpGet("logs")]
    public async Task<ActionResult<BackupLogsResponse>> GetBackupLogs(
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 20, 
        [FromQuery] string? status = null,
        [FromQuery] string? timestamp = null)
    {
        var tenantId = _ambientDataResolver.GetCurrentTenantId()!.Value;
        
        // Get logs from specific timestamp or latest
        var backupLogs = string.IsNullOrEmpty(timestamp)
            ? await _logFileService.ReadLatestLogsAsync(tenantId)
            : await _logFileService.ReadLogsByTimestampAsync(tenantId, timestamp);

		if(backupLogs == null)
        {
            return Ok(new BackupLogsResponse
			{
				Logs = new List<BackupLogDto>(),
				TotalCount = 0,
				Page = page,
				PageSize = pageSize,
				TotalPages = 0
			});
        }

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<BackupLog.BackupStatus>(status, true, out var statusEnum))
        {
            backupLogs = backupLogs.Where(log => log.Status == statusEnum).ToList();
        }

        var totalCount = backupLogs.Count();

        var logs = backupLogs
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(log => new BackupLogDto
            {
                Id = log.Id,
                ItemType = log.ItemType,
                ItemId = log.ItemId,
                ItemName = log.ItemName,
                ItemLastUpdated = log.ItemLastUpdated,
                StartedAt = log.StartedAt,
                CompletedAt = log.CompletedAt,
                Status = (int)log.Status,
                ErrorMessage = log.ErrorMessage,
                FileSizeBytes = log.FileSizeBytes,
                BackupFileName = log.BackupFileName ?? "",
				TargetSystem = log.TargetSystem,
				TargetType = log.TargetType
            })
            .ToList();

			logs = logs.OrderByDescending(l => l.StartedAt).ToList();

        return Ok(new BackupLogsResponse
        {
            Logs = logs,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            TotalPages = (int)Math.Ceiling((double)totalCount / pageSize)
        });
    }

    [HttpGet("log-history")]
    public ActionResult<List<BackupLogHistoryInfo>> GetBackupLogHistory([FromQuery] int limit = 10)
    {
        var tenantId = _ambientDataResolver.GetCurrentTenantId()!.Value;
        var logHistory = _logFileService.GetBackupLogHistory(tenantId, limit);
        return Ok(logHistory);
    }

    public class BackupLogsResponse
    {
        public required List<BackupLogDto> Logs { get; set; }
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }

    public class BackupLogDto
    {
        public int Id { get; set; }
        public required string ItemType { get; set; }
        public int ItemId { get; set; }
        public required string ItemName { get; set; }
        public DateTimeOffset ItemLastUpdated { get; set; }
        public DateTimeOffset StartedAt { get; set; }
        public DateTimeOffset? CompletedAt { get; set; }
        public required int Status { get; set; }
        public string? ErrorMessage { get; set; }
        public long? FileSizeBytes { get; set; }
        public required string BackupFileName { get; set; }
		public required string TargetSystem { get; set; }
		public required string TargetType { get; set; }
    }

	public class BackupRequest
	{
		public string Target { get; set; } = string.Empty;
		public string Password { get; set; } = string.Empty;
		public string ProviderName { get; set; } = string.Empty;
		public string EncryptionMode { get; set; } = string.Empty;
	}

	public class SetBackupIntervalRequest
	{
		public int IntervalMinutes { get; set; }
	}

	public class TenantBackupConfig
	{
		public int TenantId { get; set; }
		public int IntervalMinutes { get; set; }
		public DateTime LastUpdated { get; set; }
	}
}
