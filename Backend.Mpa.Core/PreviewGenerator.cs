// See https://aka.ms/new-console-template for more information
using System.Diagnostics;
using Backend.Core.Infrastructure;
using Backend.Mpa.Core.Store;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using NetVips;

namespace Backend.Mpa.Core;


[RegisterService(ServiceLifetime.Scoped)]
public class PreviewGenerator
{
	private static readonly bool VipsAvailable = ModuleInitializer.VipsInitialized;
	private static int _vipsUnavailableLogged;

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
		// ["image/heic"] = typeof(RasterImagePreviewGenerator),
		// ["image/heic-sequence"] = typeof(RasterImagePreviewGenerator),
		["image/heif"] = typeof(RasterImagePreviewGenerator),
		["image/heif-sequence"] = typeof(RasterImagePreviewGenerator),
		["image/avif"] = typeof(RasterImagePreviewGenerator),
		["image/avif-sequence"] = typeof(RasterImagePreviewGenerator),
		["image/jxl"] = typeof(RasterImagePreviewGenerator),
		["image/x-portable-pixmap"] = typeof(RasterImagePreviewGenerator),
		["image/x-portable-graymap"] = typeof(RasterImagePreviewGenerator),
		["image/x-portable-bitmap"] = typeof(RasterImagePreviewGenerator),
		["image/x-portable-floatmap"] = typeof(RasterImagePreviewGenerator)
	};

	private readonly IServiceScope _serviceScope;
	private readonly ILogger<PreviewGenerator> _logger;

	public PreviewGenerator(IServiceScopeFactory serviceScopeFactory, ILogger<PreviewGenerator> logger)
	{
		_serviceScope = serviceScopeFactory.CreateScope();
		_logger = logger;

		if (!VipsAvailable && Interlocked.Exchange(ref _vipsUnavailableLogged, 1) == 0)
		{
			logger.LogWarning(
				"libvips could not be loaded, so image and PDF previews are disabled. Original files will be served instead. Reason: {Reason}",
				ModuleInitializer.Exception?.Message);
		}
	}


	public bool AcceptsMimeType(string mimeType)
	{
		return VipsAvailable && _previewGenerators.ContainsKey(mimeType);
	}


	/// <summary>
	/// Generates a preview, or returns <c>null</c> when no preview can be produced (for example when
	/// libvips, or the loader for the given format, is unavailable). Callers should fall back to the
	/// original file in that case.
	/// </summary>
	public Stream? GeneratePreview(Stream originalStream, string mimeType, int maxX, int maxY, int pageNumber)
	{
		if (!AcceptsMimeType(mimeType))
		{
			return null;
		}

		try
		{
			return GetPreviewGenerator(mimeType).GeneratePreview(originalStream, mimeType, maxX, maxY, pageNumber);
		}
		catch (Exception e) when (IsNativeLibraryFailure(e))
		{
			_logger.LogWarning(e, "Unable to generate a preview for {MimeType}. The original file will be served instead.", mimeType);
			return null;
		}
	}


	/// <summary>
	/// Reads type specific metadata, or returns <c>null</c> when it cannot be determined (for example
	/// when libvips, or the loader for the given format, is unavailable).
	/// </summary>
	public ITypeSpecificMetadata? GetFileTypeSpecificMetadata(string mimeType, Stream stream)
	{
		if (!AcceptsMimeType(mimeType))
		{
			return null;
		}

		try
		{
			return GetPreviewGenerator(mimeType).GetFileTypeSpecificMetadata(stream, mimeType);
		}
		catch (Exception e) when (IsNativeLibraryFailure(e))
		{
			_logger.LogWarning(e, "Unable to read type specific metadata for {MimeType}. The file will be stored without it.", mimeType);
			return null;
		}
	}


	private static bool IsNativeLibraryFailure(Exception e)
	{
		// VipsException is also thrown when libvips is present but has no loader for the format.
		return e is DllNotFoundException or TypeInitializationException or VipsException;
	}


	private IPreviewGenerator GetPreviewGenerator(string mimeType)
	{
		var generatorType = _previewGenerators.GetValueOrDefault(mimeType) ?? typeof(FallbackPreviewGenerator);
		var generator = (IPreviewGenerator)_serviceScope.ServiceProvider.GetRequiredService(generatorType);
		return generator;
	}
}


public interface IPreviewGenerator
{
	Stream GeneratePreview(Stream originalStream, string mimeType, int maxX, int maxY, int pageNumber);
	ITypeSpecificMetadata? GetFileTypeSpecificMetadata(Stream stream, string mimeType);
}


[RegisterService(ServiceLifetime.Scoped, RegistrationMode.RegisterAsSelf)]
public class FallbackPreviewGenerator : IPreviewGenerator
{
	public Stream GeneratePreview(Stream originalStream, string mimeType, int maxX, int maxY, int pageNumber)
	{
		return originalStream;
	}

	public ITypeSpecificMetadata? GetFileTypeSpecificMetadata(Stream stream, string mimeType)
	{
		return null;
	}
}


[RegisterService(ServiceLifetime.Scoped, RegistrationMode.RegisterAsSelf)]
public class RasterImagePreviewGenerator : IPreviewGenerator
{
	public Stream GeneratePreview(Stream originalStream, string mimeType, int maxX, int maxY, int pageNumber)
	{
		if (originalStream.CanSeek)
		{
			originalStream.Position = 0;
		}


		using var image = Image.NewFromStream(originalStream);
		var thumb = image.ThumbnailImage(maxX, maxY);

		var previewStream = new MemoryStream();
		thumb.WriteToStream(previewStream, ".png", new VOption
		{
			{ "compression", 3 },
			{ "interlace", true }
		});

		// previewStream.Position = 0;
		return previewStream;
	}

	public ITypeSpecificMetadata? GetFileTypeSpecificMetadata(Stream stream, string mimeType)
	{
		if (stream.CanSeek)
		{
			stream.Position = 0;
		}

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