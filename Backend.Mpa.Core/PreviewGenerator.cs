// See https://aka.ms/new-console-template for more information
using System.Diagnostics;
using Backend.Core.Infrastructure;
using Backend.Mpa.Core.Store;
using Microsoft.Extensions.DependencyInjection;
using NetVips;

namespace Backend.Mpa.Core;


[RegisterService(ServiceLifetime.Scoped)]
public class PreviewGenerator
{
	private readonly Dictionary<string, Type> _previewGenerators = new Dictionary<string, Type>()
	{
		["application/pdf"] = typeof(PdfPreviewGenerator),

		["image/jpeg"] = typeof(RasterImagePreviewGenerator),
		["image/png"] = typeof(RasterImagePreviewGenerator),
		["image/webp"] = typeof(RasterImagePreviewGenerator),
		["image/tiff"] = typeof(RasterImagePreviewGenerator),
		["image/gif"] = typeof(RasterImagePreviewGenerator),
		["image/jp2"] = typeof(RasterImagePreviewGenerator),
		["image/jpeg2000"] = typeof(RasterImagePreviewGenerator),
		["image/jpeg2000-image"] = typeof(RasterImagePreviewGenerator),
		["image/x-portable-pixmap"] = typeof(RasterImagePreviewGenerator),
		["image/x-portable-graymap"] = typeof(RasterImagePreviewGenerator),
		["image/x-portable-bitmap"] = typeof(RasterImagePreviewGenerator),
		["image/x-portable-floatmap"] = typeof(RasterImagePreviewGenerator)
	};

	private readonly IServiceScope _serviceScope;

	public PreviewGenerator(IServiceScopeFactory serviceScopeFactory)
	{
		_serviceScope = serviceScopeFactory.CreateScope();
	}


	public bool AcceptsMimeType(string mimeType)
	{
		return _previewGenerators.ContainsKey(mimeType);
	}


	public Stream GeneratePreview(Stream originalStream, string mimeType, int maxX, int maxY, int pageNumber)
	{
		var generatorType = _previewGenerators.GetValueOrDefault(mimeType) ?? throw new NotSupportedException($"No preview generator available for mime type: {mimeType}");
		var generator = (IPreviewGenerator)_serviceScope.ServiceProvider.GetRequiredService(generatorType);

		Debug.WriteLine($"Generating preview for {mimeType} using libvips");
		return generator.GeneratePreview(originalStream, mimeType, maxX, maxY, pageNumber);
	}


	public ITypeSpecificMetadata? GetFileTypeSpecificMetadata(string mimeType, Stream stream)
	{
		var generatorType = _previewGenerators.GetValueOrDefault(mimeType) ?? throw new NotSupportedException($"No preview generator available for mime type: {mimeType}");
		var generator = (IPreviewGenerator)_serviceScope.ServiceProvider.GetRequiredService(generatorType);

		return generator.GetFileTypeSpecificMetadata(stream, mimeType);
	}

}


public interface IPreviewGenerator
{
	Stream GeneratePreview(Stream originalStream, string mimeType, int maxX, int maxY, int pageNumber);
	ITypeSpecificMetadata? GetFileTypeSpecificMetadata(Stream stream, string mimeType);
}


[RegisterService(ServiceLifetime.Scoped, RegistrationMode.RegisterAsSelf)]
public class RasterImagePreviewGenerator : IPreviewGenerator
{
	public Stream GeneratePreview(Stream originalStream, string mimeType, int maxX, int maxY, int pageNumber)
	{
		Debug.WriteLine("Generating image preview using libvips");
		var previewStream = new MemoryStream();

		using (var image = Image.NewFromStream(originalStream))
		{
			var thumb = image.ThumbnailImage(maxX, maxY);

			thumb.WriteToStream(previewStream, ".png", new VOption
			{
				{ "compression", 3 },
				{ "interlace", true }
			});
		}

		previewStream.Position = 0;
		return previewStream;
	}

	public ITypeSpecificMetadata? GetFileTypeSpecificMetadata(Stream stream, string mimeType)
	{
		using var image = Image.NewFromStream(stream);
		return new RasterImageMetadata
		{
			Width = image.Width,
			Height = image.Height
		};
	}
}


[RegisterService(ServiceLifetime.Scoped, RegistrationMode.RegisterAsSelf)]
public class PdfPreviewGenerator : IPreviewGenerator
{
	public Stream GeneratePreview(Stream originalStream, string mimeType, int maxX, int maxY, int pageNumber)
	{
		Debug.WriteLine("Generating PDF preview using libvips");
		var previewStream = new MemoryStream();

		using (var image = Image.NewFromStream(originalStream))
		{
			var thumb = image.ThumbnailImage(maxX, maxY);

			thumb.WriteToStream(previewStream, ".png", new VOption
			{
				{ "compression", 3 },
				{ "interlace", true }
			});
		}

		previewStream.Position = 0;
		return previewStream;
	}

	public ITypeSpecificMetadata? GetFileTypeSpecificMetadata(Stream stream, string mimeType)
	{
		using var image = Image.NewFromStream(stream);
		return new PdfMetadata
		{
			PageCount = (int)image.Get("n-pages")
		};
	}
}