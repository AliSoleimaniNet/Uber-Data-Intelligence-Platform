using Hangfire;
using Hangfire.PostgreSql;
using Scalar.AspNetCore;
using UberApi.Data;
using UberApi.Features.Analytics;
using UberApi.Features.ChatBot;
using UberApi.Features.Ingestion;
using UberApi.Features.QdrantSync;
using UberApi.Features.Rides;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

builder.Services.AddControllers();

builder.Services.AddOpenApi();

builder.AddNpgsqlDataSource("uber-db");

builder.AddQdrantClient("qdrant");

builder.Services.AddScoped<IngestionService>();
builder.Services.AddScoped<RidesService>();
builder.Services.AddScoped<AnalyticsService>();
builder.Services.AddScoped<ChatService>();
builder.Services.AddScoped<DatabaseInitializer>();

builder.Services.AddHttpClient();
builder.Services.AddScoped<EmbeddingService>();
builder.Services.AddHostedService<QdrantSyncWorker>();

builder.Services.AddHangfire(config => config
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(c => c.UseNpgsqlConnection(builder.Configuration.GetConnectionString("uber-db"))));

builder.Services.AddHangfireServer();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin();
        policy.AllowAnyMethod();
        policy.AllowAnyHeader();
    });
});

var app = builder.Build();

app.MapDefaultEndpoints();


app.MapOpenApi();

app.MapScalarApiReference(options => {
    options.WithTitle("Uber Data Pipeline API")
           .WithTheme(ScalarTheme.DeepSpace)
           .WithDefaultHttpClient(ScalarTarget.JavaScript, ScalarClient.Fetch);
});

app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var init = scope.ServiceProvider.GetRequiredService<DatabaseInitializer>();
    await init.InitializeDatabaseAsync();
}

app.UseHangfireDashboard();

app.UseCors("AllowAll");

app.Run();
