using Backend.DbModel.Database;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.WebApi.Controllers;


[ApiController]
[Route("api/[Controller]")]
[Authorize]
public class ArchiveController : ControllerBase
{
    private readonly MpaDbContext _dbContext;

    public ArchiveController(MpaDbContext dbContext)
    {
        _dbContext = dbContext;
    }


    [HttpGet("list")]
    public async Task<ActionResult<IEnumerable<ArchiveItemResponse>>> List(ListRequest request)
    {
        return await _dbContext.ArchiveItems
            .Select(item => new ArchiveItemResponse { Id = item.Id, Title = item.Title })
            .ToListAsync();
    }


    public class ListRequest
    {
        //TODO: Is filtering or paging needed?
    }

    public class ArchiveItemResponse
    {
        public int Id { get; set; }
        public required string Title { get; set; }
    }
}

