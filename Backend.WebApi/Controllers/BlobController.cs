using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.WebApi.Controllers;


[ApiController]
[Route("api/[Controller]/[Action]")]
[Authorize]
public class BlobController : ControllerBase
{
    [HttpGet]
    public ActionResult<byte[]> GetRawFile()
    {
        throw new NotImplementedException();
        //Idea for later: Require special role or priviliges to download raw files
    }

    [HttpGet]
    public ActionResult<byte[]> GetPreviewImage([FromQuery]DimensionEnum dimensions, [FromQuery]int pageNo =  1)
    {
        // IMPORTANT: GetPreviewImage must be a HTTP GET request, so that the URL can be used in <img src="..."> tags

        throw new NotImplementedException();
        // Any loggged in users can download preview images for their current tenant
        // Idea for later: preview images can have watermarks
    }


    public enum DimensionEnum
    {
        Small,
        Medium,
        Large
    }
}
