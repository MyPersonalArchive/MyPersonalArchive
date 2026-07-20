using System.Text.Json;
using Backend.Core;
using Backend.Core.Infrastructure;
using Backend.Core.Providers;
using Backend.Core.Services;
using Microsoft.Extensions.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Backend.Mpa.DbModel.Database;
using Backend.Mpa.DbModel.Database.EntityModels;
using Backend.Mpa.Core.Store;


namespace Backend.Mpa.Core.Services;

[RegisterService(ServiceLifetime.Scoped)]
public class BlobQueryService
{
	private readonly BlobObjectStore _blobObjectStore;
	private readonly MpaDbContext _dbContext;

	public BlobQueryService(BlobObjectStore blobObjectStore, MpaDbContext dbContext)
	{
		_blobObjectStore = blobObjectStore;
		_dbContext = dbContext;
	}


	public async Task<(Stream contentStream, FileMetadata metadata, Blob blob)?> GetBlob(Guid blobId)
	{
		var blob = await _dbContext.Blobs.SingleOrDefaultAsync(blob => blob.Id == blobId);
		if (blob == null)
		{
			return null;
		}
		var filename = blob.PathInStore.Split('/').Last();
		var objectId = Guid.Parse(Path.GetFileNameWithoutExtension(filename));

		var metadataStream = await _blobObjectStore.GetObject(objectId, "metadata");
		if(metadataStream is null)
		{
			return null;
		}
		var metadata = JsonSerializer.Deserialize<FileMetadata>(metadataStream, JsonSerializerOptions.Web) ?? throw new Exception("Failed to deserialize metadata");
	
		var contentStream = await _blobObjectStore.GetObject(objectId, Path.GetExtension(filename).TrimStart('.'));
		if(contentStream is null)
		{
			return null;
		}

		return (contentStream, metadata, blob);
	}


	public async Task<Blob?> GetBlobEntity(Guid blobId)
	{
		var blob = await _dbContext.Blobs
			.Include(blob => blob.UploadedBy)
			.Include(blob => blob.ArchiveItem)
			.SingleOrDefaultAsync(blob => blob.Id == blobId);
		return blob;
	}


	public async Task<ICollection<Blob>> GetBlobEntities(IEnumerable<Guid> blobIds)
	{
		var blobs = await _dbContext.Blobs
			.Include(blob => blob.UploadedBy)
			.Include(blob => blob.ArchiveItem)
			.Where(blob => blobIds.Contains(blob.Id))
			.ToListAsync();
			
		return blobs;
	}


	public async Task<IEnumerable<Blob>> ListBlobEntities()
	{
		var blobs = await _dbContext.Blobs
			.Include(blob => blob.UploadedBy)
			.Include(blob => blob.ArchiveItem)
			.ToListAsync();

		return blobs;
	}

}
