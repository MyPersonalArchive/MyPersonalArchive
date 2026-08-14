using Backend.Core.Cqrs.Infrastructure;
using Backend.Core.Providers.Store;
using Backend.Core.Services;
using Backend.Mpa.Core.Services;


namespace Backend.Mpa.Core.Cqrs;


[RequireOrganizationId]
public class GetTiers : IQuery<GetTiers, GetTiers.Response>
{
	// No parameters to get Tiers

	public class Response
	{
		public required string CurrentTierId { get; set; }
		public required IEnumerable<Tier> AvailableTiers { get; set; }

		public class Tier
		{
			public required string Id { get; set; }
			public required DisplayFields Display { get; set; }
			public required long MaxStorageBytes { get; set; }
			public required decimal PricePerMonthEUR { get; set; }

		}
		public class DisplayFields
		{
			public required string Medal { get; set; }
			public required string Title { get; set; }
			public required string Description { get; set; }
			public required string Subtitle { get; set; }
			public required IEnumerable<string> Features { get; set; }
		}

	}
}


[RequireOrganizationId]
public class SetTier : ICommand<SetTier>
{
	public required string TierId { get; set; }
}


public class SubscriptionHandler :
	IAsyncQueryHandler<GetTiers, GetTiers.Response>,
	IAsyncCommandHandler<SetTier>
{
	public readonly TierService _tierService;
	public readonly TenantService _tenantService;
	
	public SubscriptionHandler(TierService tierService, TenantService tenantService)
	{
		_tierService = tierService;
		_tenantService = tenantService;
	}


	public async Task<GetTiers.Response> Handle(GetTiers query)
	{
		var tierSettingsTask = _tierService.GetTierSettingsAsync();
		var currentTenantSettingsTask = _tenantService.GetCurrentTenantSettingsAsync();

		Task.WaitAll(tierSettingsTask, currentTenantSettingsTask);

		var tierSettings = tierSettingsTask.Result;
		var currentTenantSettings = currentTenantSettingsTask.Result;
		
		var currentTier = currentTenantSettings.TierId;

		return new GetTiers.Response
		{
			CurrentTierId = currentTier,
			AvailableTiers = tierSettings.Tiers.Where(tier => tier.IsActive).Select(tier => new GetTiers.Response.Tier
			{
				Id = tier.Id,
				Display = new GetTiers.Response.DisplayFields
				{
					Medal = tier.Display.Medal,
					Title = tier.Display.Title,
					Description = tier.Display.Description,
					Subtitle = tier.Display.Subtitle,
					Features = tier.Display.Features
				},
				MaxStorageBytes = tier.MaxStorageBytes,
				PricePerMonthEUR = tier.PricePerMonthEUR
			}).ToList()
		};
	}

	public async Task Handle(SetTier command)
	{
		await _tenantService.SetTierAsync(command.TierId);
	}
}
