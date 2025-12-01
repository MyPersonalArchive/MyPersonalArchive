using Backend.Backup.Providers;
using Backend.Backup.Services;
using Backend.Core.Providers;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Backup;

public static class BackupServiceCollectionExtensions
{
    public static IServiceCollection AddBackupServices(
        this IServiceCollection services, 
        Action<BackupConfiguration> configureOptions)
    {
		services.AddSingleton<PeerMappingStore>();
		services.AddSingleton<RecoveryCodeStore>();
		services.AddSingleton<WebRTCConnectionPool>();
		services.AddSingleton<PeerConnectionService>();
		services.AddHostedService(sp => sp.GetRequiredService<PeerConnectionService>());

        services.Configure(configureOptions);
        services.AddScoped<BackupLogFileService>();
        services.AddScoped<BackupRepository>();
        services.AddSingleton<TenantBackupManager>();
        services.AddSingleton<TenantRestoreManager>();
        
        // Register factories and providers
        services.AddSingleton<BackupProviderFactory>();
        services.AddSingleton<EncryptionProviderFactory>();
        services.AddScoped<BuddyTargetBackupProvider>();
        
        // BackupService is not registered - it's created manually with tenantId parameter
        
        return services;
    }
}

