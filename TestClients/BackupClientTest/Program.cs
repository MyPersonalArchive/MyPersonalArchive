public static class Program
{
    private static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Add services to the container.
        // Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
        builder.Services.AddOpenApi();

        builder.Services.AddControllers();
        builder.RegisterSwaggerServices();
        builder.WebHost.UseUrls("http://0.0.0.0:5555");


        var app = builder.Build();

        // Configure the HTTP request pipeline.
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        // app.UseHttpsRedirection();

        app.UseStaticFiles();
        app.MapControllers();
        app.Run();
    }

    private static void RegisterSwaggerServices(this IHostApplicationBuilder builder)
    {
        var services = builder.Services;

        // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen();
    }
}