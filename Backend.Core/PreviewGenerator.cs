// See https://aka.ms/new-console-template for more information
using NetVips;

namespace Backend.Core;

public static class PreviewGenerator
{
    public static Stream GeneratePreview(Stream originalStream, string mimeType, int maxX, int maxY, int pageNumber)
    {
        switch (mimeType)
        {
            case "application/pdf":
                return GeneratePreviewOfPDF(originalStream, maxX, maxY, pageNumber);

            default:
                return GeneratePreviewOfImage(originalStream, maxX, maxY);
        }
    }


    public static Stream GeneratePreviewOfImage(Stream originalStream, int maxX, int maxY)
    {
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

    public static Stream GeneratePreviewOfPDF(Stream originalStream, int maxX, int maxY, int pageNumber = 0)
    {
        var previewStream = new MemoryStream();

		using (var image = Image.PdfloadStream(originalStream, page: pageNumber, dpi: 200))
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

    public static int GetDocumentPageCount(string mimeType, Stream stream)
    {
        stream.Seek(0, SeekOrigin.Begin);

        switch (mimeType)
        {
            case "application/pdf":
                {
                    using var image = Image.NewFromStream(stream);
                    return (int)image.Get("n-pages");
                }
            default:
                return 1;
        }
    }
}