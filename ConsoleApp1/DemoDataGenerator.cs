using System.Diagnostics;
using System.Text.Json.Nodes;
using Backend.Core.Infrastructure;
using Backend.Mpa.Core.Services;
using Microsoft.Extensions.DependencyInjection;

namespace ConsoleApp1;

public class DemoDataGenerator
{

	private class GeneratorData
	{
		public int TenantId;
		public required IEnumerable<string> Usernames;
		public required IEnumerable<string> FirstPart;
		public required IEnumerable<string> SecondPart;
		public required IEnumerable<string> ThirdPart;
		public required IEnumerable<string> FourthPart;
		public required IEnumerable<string> Tags;
	}

	private static readonly GeneratorData[] _generatorData =
	[
		new GeneratorData
		{
			TenantId = -1,
			Usernames = ["admin@localhost"],
			FirstPart = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth"],
			SecondPart = ["demo", "test", "example", "sample", "trial", "pilot"],
			ThirdPart = ["item", "entry", "record", "piece", "object"],
			FourthPart = ["only"],
			Tags = ["Disco", "Pop", "Metal", "Rock", "Techno", "Rave", "House", "EDM", "Hiphop", "Jazz", "Blues", "Classical", "Opera", "Reggae", "Ska", "Country", "Folk", "HipHop", "Rap", "Electronic", "Dance", "Ambient", "Chillout"]
		},
		new GeneratorData
		{
			TenantId = 1,
			Usernames = ["admin@localhost", "arjan@localhost"],
			FirstPart = ["Uno", "Dos", "Tres", "Cuatro", "Cinco", "Seis", "Siete", "Ocho", "Nueve", "Diez"],
			SecondPart = ["demo", "test", "example", "sample", "trial", "pilot"],
			ThirdPart = ["item", "entry", "record", "piece", "object"],
			FourthPart = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".Select(c => c.ToString()),
			Tags = ["Jamon", "Pollo", "Pescado", "Carne", "Verduras", "Frutas", "Queso"]
		},
		new GeneratorData
		{
			TenantId = 2,
			Usernames = ["admin@localhost", "stian@localhost"],
			FirstPart = ["Eins", "Zwei", "Drei", "Vier", "Fünf", "Sechs", "Sieben", "Acht", "Neun", "Zehn"],
			SecondPart = ["demo", "test", "example", "sample", "trial", "pilot"],
			ThirdPart = ["item", "entry", "record", "piece", "object"],
			FourthPart = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".Select(c => c.ToString()),
			Tags = ["München", "Dresden", "Berlin", "Hamburg", "Köln", "Frankfurt", "Stuttgart", "Düsseldorf", "Dortmund"]
		},
		new GeneratorData
		{
			TenantId = 3,
			Usernames = ["arjan@localhost"],
			FirstPart = ["Un", "Deux", "Trois", "Quatre", "Cinq", "Six", "Sept", "Huit", "Neuf", "Dix"],
			SecondPart = ["demo", "test", "example", "sample", "trial", "pilot"],
			ThirdPart = ["item", "entry", "record", "piece", "object"],
			FourthPart = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".Select(c => c.ToString()),
			Tags = ["Blanc", "Noir", "Rouge", "Vert", "Bleu", "Jaune", "Violet", "Orange", "Rose", "Marron", "Gris"]
		}
	];
	private readonly IServiceProvider _services;

	public DemoDataGenerator(IServiceProvider services)
	{
		_services = services;
	}


	public async Task Seed()
	{
		foreach (var data in _generatorData)
		{
			Debug.WriteLine($"Seeding data for tenant {data.TenantId} with usernames [{string.Join(", ", data.Usernames)}]");
			await Seed(data);
		}
	}


	private async Task Seed(GeneratorData data)
	{
		using var scope = _services.CreateScope();
		var dummyAmbientDataResolver = (DummyAmbientDataResolver)scope.ServiceProvider.GetService<IAmbientDataResolver>()!;
		dummyAmbientDataResolver.TenantId = data.TenantId;
		dummyAmbientDataResolver.Username = data.Usernames.First();

		var archiveItemQueryService = scope.ServiceProvider.GetService<ArchiveItemQueryService>()!;
		var archiveItemCommandService = scope.ServiceProvider.GetService<ArchiveItemCommandService>()!;

		var items = await archiveItemQueryService.ListArchiveItems();
		if (items.Any())
		{
			return;
		}

		var rng = new Random(data.TenantId);

		var count = 0;
		var stopwatch = Stopwatch.StartNew();
		foreach (var first in data.FirstPart)
			foreach (var second in data.SecondPart)
				foreach (var third in data.ThirdPart)
					foreach (var fourth in data.FourthPart)
				{
					var title = $"{first} {second} {third} {fourth}";
					var tags = data.Tags.OrderBy(x => rng.Next()).Take(rng.Next(0, 7));
					var username = data.Usernames.OrderBy(x => rng.Next()).First();

					var createdAt = DateTimeOffset.Now.Date.AddDays(-rng.Next(0, 365)).AddMinutes(-rng.Next(0, 1440));
					var item = new
					{
						Id = Guid.NewGuid(),
						Title = title,
						Tags = tags,
						BlobIds = new List<Guid> { },
						CreatedByUsername = username,
						CreatedAt = createdAt,
						LastUpdated = createdAt,
						Metadata = new JsonObject() { }
					};

					await archiveItemService.CreateArchiveItem(item.Title, item.Tags, new(), item.BlobIds, []);

					count++;
				}

		Debug.WriteLine($"Seeded {count} items for tenant {data.TenantId} in {stopwatch.Elapsed}");
	}
}