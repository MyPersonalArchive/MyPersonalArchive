using Backend.Backup;
using Backend.Core.Infrastructure;
using Backend.Core.Services;

namespace Backend.WebApi.Managers.Backup;

public class SignalRBackupProgressReporter : IBackupProgressReporter
{
    private readonly ISignalRService _signalRService;
    private bool _hasStarted = false;

    public SignalRBackupProgressReporter(IServiceScope scope, int tenantId)
    {
        _signalRService = ActivatorUtilities.CreateInstance<ISignalRService>(
            scope.ServiceProvider,
            new StaticAmbientDataResolver(tenantId)
        );
    }

    public async Task ReportProgressAsync(BackupLog log, int current, int total)
    {
        // Send BackupStarted on first progress report
        if (!_hasStarted)
        {
            _hasStarted = true;
            await _signalRService.PublishToTenantChannel(
                new ISignalRService.Message("BackupStarted", new { Target = log.TargetSystem })
            );
        }

        await _signalRService.PublishToTenantChannel(
            new ISignalRService.Message("BackupProgress", new 
			{ 
				Log = log,
				Current = current, 
				Total = total 
				})
        );
    }

    public Task ReportCompletedAsync()
    {
        return _signalRService.PublishToTenantChannel(
            new ISignalRService.Message("BackupCompleted", new { })
        );
    }

    public Task ReportErrorAsync(string error, string? target = null)
    {
        return _signalRService.PublishToTenantChannel(
            new ISignalRService.Message("BackupFailed", new { Error = error, Target = target })
        );
    }

    public Task ReportRestoreProgressAsync(int tenantId, object progressData)
    {
        return _signalRService.PublishToTenantChannel(
            new ISignalRService.Message("RestoreProgress", progressData)
        );
    }
}