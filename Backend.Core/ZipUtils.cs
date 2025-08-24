using System.IO.Compression;

public static class ZipUtils
{
    public static async Task<MemoryStream> CreateZipFromStreamsAsync(Dictionary<string, Stream> files)
    {
        var zipStream = new MemoryStream();
        using (var archive = new ZipArchive(zipStream, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var file in files)
            {
                var entry = archive.CreateEntry(file.Key, CompressionLevel.Optimal);
                using var entryStream = entry.Open();
                file.Value.Position = 0;
                await file.Value.CopyToAsync(entryStream);
            }
        }

        zipStream.Flush();
        zipStream.Position = 0;
        return zipStream;
    }

    public static ZipArchive UnZipStream(Stream zipStream)
    {
        using var archive = new ZipArchive(zipStream, ZipArchiveMode.Read, leaveOpen: true);
        return archive;
    }
}