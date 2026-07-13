// See https://aka.ms/new-console-template for more information
using Backend.Core.Infrastructure;
using Backend.Core.Services;
using Microsoft.Extensions.DependencyInjection;


[RegisterService(ServiceLifetime.Scoped)]
public class DummySignalRService : ISignalRService
{
	public Task PublishToSharedChannel(ISignalRService.Message message)
	{
		// Console.WriteLine($"Sending message to shared channel: {message}");
		return Task.CompletedTask;
	}

	public Task PublishToTenantChannel(ISignalRService.Message message)
	{
		// Console.WriteLine($"Sending message to tenant channel: {message}");
		return Task.CompletedTask;
	}

	public Task PublishToUserChannel(ISignalRService.Message message)
	{
		// Console.WriteLine($"Sending message to user channel: {message}");
		return Task.CompletedTask;
	}
}
