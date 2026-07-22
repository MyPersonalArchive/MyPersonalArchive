// See https://aka.ms/new-console-template for more information
using System.Text.Json;
using Backend.Core.Infrastructure;
using Backend.Core.Providers;
using Backend.Mpa.Core;
using Backend.Mpa.Core.Services;
using Backend.Mpa.Core.Store;
using Microsoft.Extensions.DependencyInjection;

public class FileStructureConverter
{
	private ServiceProvider _serviceProvider;
	private readonly PreviewGenerator _previewGenerator;

	public FileStructureConverter(ServiceProvider serviceProvider)
	{
		_serviceProvider = serviceProvider;
		_previewGenerator = serviceProvider.GetRequiredService<PreviewGenerator>();
	}


	public async Task ConvertFileStructure()
	{
		foreach (var tenantId in GetTenantIdsForBlobs())
		{
			using var scope = _serviceProvider.CreateScope();
			var dummyAmbientDataResolver = (DummyAmbientDataResolver)scope.ServiceProvider.GetService<IAmbientDataResolver>()!;
			dummyAmbientDataResolver.TenantId = tenantId;
			dummyAmbientDataResolver.Username = "admin@localhost";

			var blobCommandService = scope.ServiceProvider.GetService<BlobCommandService>()!;

			Console.WriteLine($"Moving and converting blob metadata for tenant {tenantId}...");
			await MoveAndConvertBlobs(scope);

			Console.WriteLine($"Moving tenant settings for tenant {tenantId}...");
			await MoveTenantSettings(scope);

			Console.WriteLine($"Moving user settings for tenant {tenantId}...");
			await MoveUserSettings(scope);
		}

		Console.WriteLine($"Moving system-wide settings...");
		await MoveSystemWideSettings();

	}

	private async Task MoveTenantSettings(IServiceScope scope)
	{
		foreach (var tenantId in GetTenantIdsForSettings())
		{
			Directory.CreateDirectory($"/data/Tenants/{tenantId}/Settings");
			File.Copy(
				$"/data/Settings/{tenantId}/StoredFilterSettings.json",
				$"/data/Tenants/{tenantId}/Settings/StoredFilterSettings.json",
				overwrite: true
			);
		}
	}


	private async Task MoveUserSettings(IServiceScope scope)
	{
		foreach (var tenantId in GetTenantIdsForSettings())
		{
			foreach (var userId in GetUserIdsForSettings(tenantId))
			{
				Directory.CreateDirectory($"/data/Tenants/{tenantId}/Settings/Users/{userId}");
				File.Copy(
					$"/data/Settings/{tenantId}/{userId}/ExternalAccountSettings.json",
					$"/data/Tenants/{tenantId}/Settings/Users/{userId}/ExternalAccountSettings.json",
					overwrite: true
				);
			}
			// Implement the logic to move user settings here
		}
	}


	private async Task MoveSystemWideSettings()
	{
		Directory.CreateDirectory("/data/Owner/Settings");
		File.Copy(
			"/data/Settings/System/EmailProviderSettings.json",
			"/data/Owner/Settings/EmailProviderSettings.json",
			overwrite: true
		);
	}


	private async Task MoveAndConvertBlobs(IServiceScope scope)
	{
		var ambientDataResolver = scope.ServiceProvider.GetService<IAmbientDataResolver>()!;
		var blobObjectStore = scope.ServiceProvider.GetService<BlobObjectStore>()!;

		// recursively find all blob ids in data/blobs/{tenantId} that are not .metadata files (a blob idea is the part of the filename before any extension. It should look like a Guid)
		var tenantId = ambientDataResolver.GetCurrentTenantId();
		var blobs = Directory.GetFiles($"/data/Blobs/{tenantId}", "*", SearchOption.AllDirectories)
			.Where(f => !f.EndsWith(".metadata"))
			.Select(f => (blobIdString: Path.GetFileNameWithoutExtension(f), filePath: f))
			.Where(f => Guid.TryParse(f.blobIdString, out _))
			.Select(f => (blobId: Guid.Parse(f.blobIdString), directory: Path.GetDirectoryName(f.filePath)!));

		foreach (var (blobId, directory) in blobs)
		{
			var metadataFile = Path.Combine(directory, $"{blobId}.metadata");
			if (!File.Exists(metadataFile))
			{
				Console.WriteLine($"Warning: Metadata file for blob {blobId} not found. Skipping.");
				continue;
			}

			var metadataJson = File.ReadAllText(metadataFile);
			if (string.IsNullOrWhiteSpace(metadataJson))
			{
				Console.WriteLine($"Warning: Metadata file for blob {blobId} is empty. Skipping.");
				continue;
			}

			var metadata = JsonSerializer.Deserialize<FileMetadata>(metadataJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
			if (metadata == null)
			{
				Console.WriteLine($"Warning: Failed to deserialize metadata for blob {blobId}. Skipping.");
				continue;
			}

			var blobFile = Path.Combine(directory, blobId.ToString()) + Path.GetExtension(metadata.OriginalFilename);
			if (!File.Exists(blobFile))
			{
				Console.WriteLine($"Warning: Blob file for blob {blobId} not found. Skipping.");
				continue;
			}

			using var stream = File.OpenRead(blobFile);

			Console.WriteLine($"Uploading blob {blobId} ({metadata.OriginalFilename}) for tenant {tenantId}...");
			await UploadBlobs(blobObjectStore, [(stream, metadata.OriginalFilename, metadata.MimeType, metadata.UploadedBy, metadata.UploadedAt)]);
		}
	}


	private async Task UploadBlobs(BlobObjectStore blobObjectStore, IEnumerable<(Stream contentStream, string fileName, string mimeType, string uploadedBy, DateTimeOffset uploadedAt)> files)
	{
		foreach (var file in files)
		{
			var blobId = Guid.NewGuid();
			file.contentStream.Seek(0, SeekOrigin.Begin);
			await blobObjectStore.StoreObject(blobId, Path.GetExtension(file.fileName).TrimStart('.'), file.contentStream);

			file.contentStream.Seek(0, SeekOrigin.Begin);
			var hash = Convert.ToHexString(file.contentStream.ComputeSha256Hash());

			file.contentStream.Seek(0, SeekOrigin.Begin);
			var typeSpecificMetadata = _previewGenerator.GetFileTypeSpecificMetadata(file.mimeType, file.contentStream);

			var metadata = new BlobMetadata
			{
				Id = blobId,
				OriginalFilename = file.fileName,
				MimeType = file.mimeType,
				Size = file.contentStream.Length,
				Hash = hash,
				TypeSpecificMetadata = typeSpecificMetadata,
				UploadedAt = file.uploadedAt,
				UploadedBy = file.uploadedBy
			};
			await using var objectStream = await blobObjectStore.GetWritableObjectStream(blobId, "metadata.json");
			await JsonSerializer.SerializeAsync(objectStream, metadata, JsonSerializerOptions.Web);
		}
	}


	private IEnumerable<int> GetTenantIdsForBlobs()
	{
		// each tenant has a folder in data/Blobs/{tenantId}
		var tenantFolders = Directory.GetDirectories("/data/Blobs");
		foreach (var folder in tenantFolders)
		{
			if (int.TryParse(Path.GetFileName(folder), out var tenantId))
			{
				yield return tenantId;
			}
		}
	}


	private IEnumerable<int> GetTenantIdsForSettings()
	{
		// each tenant has a folder in data/Settings/{tenantId}
		var tenantFolders = Directory.GetDirectories("/data/Settings").Where(f => Path.GetFileName(f) != "System");
		foreach (var folder in tenantFolders)
		{
			if (int.TryParse(Path.GetFileName(folder), out var tenantId))
			{
				yield return tenantId;
			}
		}
	}


	private IEnumerable<string> GetUserIdsForSettings(int tenantId)
	{
		// each user has a folder in data/Settings/{tenantId}/{userId}
		var userFolders = Directory.GetDirectories($"/data/Settings/{tenantId}/");
		foreach (var userFolder in userFolders)
		{
			yield return Path.GetFileName(userFolder);
		}
	}
}