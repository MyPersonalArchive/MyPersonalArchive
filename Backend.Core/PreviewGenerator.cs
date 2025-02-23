// See https://aka.ms/new-console-template for more information
using NetVips;

namespace Backend.Core;

public static class PreviewGenerator
{
    public static Stream GeneratePreview(Stream originalStream, string mimeType, int maxX, int maxY, int pageNumber)
    {
        switch(mimeType){
            case "application/pdf":
                return GeneratePreviewOfPDF(originalStream, maxX, maxY, pageNumber);

            default:
                return GeneratePreviewOfImage(originalStream, maxX, maxY);
        }
    }


    public static Stream GeneratePreviewOfImage(Stream originalStream, int maxX, int maxY)
    {        
        var previewStream = new MemoryStream(); //This stream will be returned to the caller, and should NOT be disposed here
        Image.NewFromStream(originalStream)
            .ThumbnailImage(maxX, maxY)
            .WriteToStream(previewStream, ".jpg");

        //TODO: cache in filesystem?
        previewStream.Position = 0;
        return previewStream;
    }

    public static Stream GeneratePreviewOfPDF(Stream originalStream, int maxX, int maxY, int pageNumber = 1)
    {
        var previewStream = new MemoryStream(); //This stream will be returned to the caller, and should NOT be disposed here
        Image.PdfloadStream(originalStream, pageNumber)
            .ThumbnailImage(maxX, maxY)
            .WriteToStream(previewStream, ".jpg");

        //TODO: cache in filesystem?
        previewStream.Position = 0;
        return previewStream;
    }
}