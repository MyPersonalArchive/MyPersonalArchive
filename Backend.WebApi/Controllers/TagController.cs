using Backend.DbModel.Database;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.WebApi.Controllers;

[ApiController]
[Route("api/[controller]/[action]")]
[Authorize]
public class TagController : ControllerBase
{
    private readonly MpaDbContext _dbContext;

    public TagController(MpaDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TagResponse>>> List()
    {
        return await _dbContext.Tags.Select(tag => new TagResponse
        {
            Title = tag.Title
        }).ToListAsync();
    }

    public class TagResponse
    {
        public required string Title { get; set; }
    }
}