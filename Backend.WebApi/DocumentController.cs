using Backend.Core.Providers;
using Backend.DbModel.Database;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.WebApi;

[ApiController]
[Route("api/[Controller]")]
public class DocumentController(MpaDbContext dbContext, IFileStorageProvider fileProvider) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("archiveitem")]
    public async Task<string> ArchiveItem(FileModel file)
    {
        var filePath = await fileProvider.StoreFile(file.FileName, file.Data);
        dbContext.ArchiveItems.Add(new ArchiveItem
        {
            Created = DateTime.Now,
            Title = file.Title,
            Tags = new List<Tag>(),
            Blobs = new List<Blob>
            {
                new()
                {
                    PathInStore = filePath,
                    StoreRoot = StoreRoot.FileStorage.ToString()
                }
            },
        });

        await dbContext.SaveChangesAsync();
        return filePath;
    }

    [AllowAnonymous]
    [HttpGet("getarchiveditem")]
    public async Task<StorageFile> GetArchivedItem(string fileName)
    {
        return await fileProvider.GetFile(fileName);
    }

    [AllowAnonymous]
    [HttpDelete("deletearchiveditem")]
    public async Task DeleteArchivedItem(string fileName)
    {
        //Delete from db 
        
        fileProvider.DeleteFile(fileName);
    }
}

public class FileModel
{
    public string Title { get; set; }
    public string FileName { get; set; }
    public string Data { get; set; }
}