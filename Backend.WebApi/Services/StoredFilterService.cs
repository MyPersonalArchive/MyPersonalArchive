using Backend.Core;
using Backend.DbModel.Database.EntityModels;
using Message = Backend.WebApi.Services.SignalRService.Message;

namespace Backend.WebApi.Services;

[RegisterService(ServiceLifetime.Scoped)]
public class StoredFilterService
{
	private readonly SignalRService _signalRService;
	public StoredFilterService(SignalRService signalRService)
	{
		_signalRService = signalRService;
	}

	
	#region SignalR message creators
	public async Task PublishStoredFiltersAddedMessage(IEnumerable<StoredFilter> storedFilters) => await PublishStoredFiltersAddedMessage(storedFilters.Select(storedFilter => storedFilter.Id));
	public async Task PublishStoredFiltersAddedMessage(IEnumerable<int> storedFilterIds)
	{
		if(storedFilterIds == null || !storedFilterIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new Message("StoredFiltersAdded", storedFilterIds));
	}

	public async Task PublishStoredFiltersUpdatedMessage(IEnumerable<StoredFilter> storedFilters) => await PublishStoredFiltersUpdatedMessage(storedFilters.Select(storedFilter => storedFilter.Id));
	public async Task PublishStoredFiltersUpdatedMessage(IEnumerable<int> storedFilterIds)
	{
		if(storedFilterIds == null || !storedFilterIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new Message("StoredFiltersUpdated", storedFilterIds));
	}

	public async Task PublishStoredFiltersDeletedMessage(IEnumerable<StoredFilter> storedFilters) => await PublishStoredFiltersDeletedMessage(storedFilters.Select(storedFilter => storedFilter.Id).ToList());
	public async Task PublishStoredFiltersDeletedMessage(IEnumerable<int> storedFilterIds)
	{
		if(storedFilterIds == null || !storedFilterIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new Message("StoredFiltersDeleted", storedFilterIds));
	}
	#endregion
}
