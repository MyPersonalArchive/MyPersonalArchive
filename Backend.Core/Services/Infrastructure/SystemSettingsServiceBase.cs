using Backend.Core.Infrastructure;
using Microsoft.Extensions.Options;

namespace Backend.Core.Services.Infrastructure;

public abstract class SystemSettingsServiceBase<T> : SettingsServiceBase<T> where T : SettingsBase, new()
{
	protected SystemSettingsServiceBase(IOptions<AppConfig> config, IAmbientDataResolver resolver)
		: base(config, resolver)
	{
	}

	protected override string GetSettingsPath()
	{
		return Path.Combine(SettingsFolder, "System");
	}
}
