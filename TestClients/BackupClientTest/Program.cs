using Microsoft.AspNetCore.Server.Kestrel.Core;

public static class Program
{
    private static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Add services to the container.
        // Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
        builder.Services.AddOpenApi();
        builder.Services.Configure<KestrelServerOptions>(options =>
                {
                    options.Limits.MaxRequestBodySize = 100000000; // Increase the limit to 100MB
                });

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

        TestEncryptDecrypt();
        TestEncryptDecryptZip();

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

    private static void TestEncryptDecrypt()
    {
        var test = new OpenSslAes256Cbc();

        var filePath = $"TestFiles/sample-local-pdf.pdf";
        using var stream = new FileStream(filePath, FileMode.Open);
        var encryptedStream = test.Encrypt(stream, "test");

        var encryptedFilePath = $"TestFiles/Encrypted/sample-local-pdf_encrypted.pdf";
        using var encryptedStream2 = new FileStream(encryptedFilePath, FileMode.Create);
        encryptedStream.CopyTo(encryptedStream2);

        encryptedStream.Position = 0;
        var decrypted = test.Decrypt(encryptedStream, "test");

        var decryptedFilePath = $"TestFiles/Decrypted/sample-local-pdf_decrypted.pdf";
        using var decryptedStream = new FileStream(decryptedFilePath, FileMode.Create);
        decrypted.CopyTo(decryptedStream);
    }
    
    private static void TestEncryptDecryptZip()
    {
        var filePath = $"TestFiles/sample-local-pdf.pdf";

        var test = new OpenSslAes256Cbc();
        var zipEntries = new Dictionary<string, Stream>();
        zipEntries.Add("sample-local-pdf.pdf", new FileStream(filePath, FileMode.Open));

        var zipStream = ZipUtils.CreateZipFromStreamsAsync(zipEntries).Result;

        var encryptedStream = test.Encrypt(zipStream, "test");

        var encryptedFilePath = $"TestFiles/Encrypted/sample-local-pdf_encrypted.zip.enc";
        using var encryptedStream2 = new FileStream(encryptedFilePath, FileMode.Create);
        encryptedStream.CopyTo(encryptedStream2);

        encryptedStream.Position = 0;
        var decrypted = test.Decrypt(encryptedStream, "test");

        var decryptedFilePath = $"TestFiles/Decrypted/sample-local-pdf_decrypted.zip";
        using var decryptedStream = new FileStream(decryptedFilePath, FileMode.Create);
        decrypted.CopyTo(decryptedStream);
    }
}