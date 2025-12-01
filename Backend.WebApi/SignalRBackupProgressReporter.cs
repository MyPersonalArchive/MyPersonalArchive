using Backend.Backup;
using Backend.Core;
using Backend.Core.Infrastructure;
using Backend.WebApi.Services;
using Backend.WebApi.SignalR;
using Microsoft.Extensions.DependencyInjection;
using static Backend.WebApi.SignalR.SignalRService;

namespace Backend.WebApi.Managers.Backup;

public class SignalRBackupProgressReporter : IBackupProgressReporter
{
    private readonly SignalRService _signalRService;
    private bool _hasStarted = false;

    public SignalRBackupProgressReporter(IServiceScope scope, int tenantId)
    {
        _signalRService = ActivatorUtilities.CreateInstance<SignalRService>(
            scope.ServiceProvider,
            new StaticAmbientDataResolver(tenantId)
        );
    }

    public async Task ReportProgressAsync(Backend.Backup.BackupLog log, int current, int total)
    {
        // Send BackupStarted on first progress report
        if (!_hasStarted)
        {
            _hasStarted = true;
            await _signalRService.PublishToTenantChannel(
                new Message("BackupStarted", new { Target = log.TargetSystem })
            );
        }

        await _signalRService.PublishToTenantChannel(
            new Message("BackupProgress", new 
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
            new Message("BackupCompleted", new { })
        );
    }

    public Task ReportErrorAsync(string error, string? target = null)
    {
        return _signalRService.PublishToTenantChannel(
            new Message("BackupFailed", new { Error = error, Target = target })
        );
    }

    public Task ReportRestoreProgressAsync(int tenantId, object progressData)
    {
        return _signalRService.PublishToTenantChannel(
            new Message("RestoreProgress", progressData)
        );
    }
}