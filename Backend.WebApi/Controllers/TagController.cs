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
    public async Task<ActionResult<IList<string>>> List()
    {
        return await _dbContext.Tags.Select(tag =>  tag.Title).ToListAsync();
    }
}