using System.Text.Json.Nodes;
using Backend.Core.Infrastructure;
using Backend.Core.Services;
using Backend.Mpa.DbModel.Database;
using Backend.Mpa.DbModel.Database.EntityModels;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Mpa.Core.Services;

[RegisterService(ServiceLifetime.Scoped)]
public class ArchiveItemQueryService
{
	private readonly MpaDbContext _dbContext;

	public ArchiveItemQueryService(MpaDbContext dbContext)
	{
		_dbContext = dbContext;
	}


	public async Task<ArchiveItem?> GetArchiveItem(Guid id)
	{
		var archiveItems = _dbContext.ArchiveItems
			.Include(archiveItem => archiveItem.Blobs)
			.Include(archiveItem => archiveItem.Tags)
			.Where(archiveItem => archiveItem.Id == id);

		return await archiveItems.SingleOrDefaultAsync();
	}


	public async Task<IEnumerable<ArchiveItem>> ListArchiveItems(string? titleFilter = null, IEnumerable<string>? tagsFilter = null, IEnumerable<string>? metadataTypesFilter = null)
	{
		var archiveItems = _dbContext.ArchiveItems
			.Include(archiveItem => archiveItem.Tags)
			.Include(archiveItem => archiveItem.Blobs)
			.ConditionalWhere(!string.IsNullOrEmpty(titleFilter), archiveItem => archiveItem.Title!.ToLower().Contains(titleFilter!, StringComparison.InvariantCultureIgnoreCase))
			.ToList()
			.ConditionalWhere(tagsFilter != null && tagsFilter!.Any(), archiveItem => tagsFilter!.All(tag => archiveItem.Tags.Any(t => t.Title == tag)))
			.ConditionalWhere(metadataTypesFilter != null && metadataTypesFilter!.Any(), archiveItem => metadataTypesFilter!.All(metadataType => archiveItem.Metadata.ContainsKey(metadataType.ToLower())))
			.ToList();
		return archiveItems;
	}
}
