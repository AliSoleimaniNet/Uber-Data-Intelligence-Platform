using Dapper;
using Npgsql;
using Qdrant.Client;
using Qdrant.Client.Grpc;

namespace UberApi.Features.QdrantSync
{
    public class QdrantSyncWorker(IServiceProvider serviceProvider, ILogger<QdrantSyncWorker> logger) : BackgroundService
    {
        private const string CollName = "uber_cancellations";

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try { await SyncData(); }
                catch (Exception ex) { logger.LogError(ex, "Sync Error"); }

                await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken); 
            }
        }

        private async Task SyncData()
        {
            using var scope = serviceProvider.CreateScope();
            var client = scope.ServiceProvider.GetRequiredService<QdrantClient>();
            var db = scope.ServiceProvider.GetRequiredService<NpgsqlDataSource>();
            var embedder = scope.ServiceProvider.GetRequiredService<EmbeddingService>();

            var exists = await client.ListCollectionsAsync();
            if (!exists.Contains(CollName))
                await client.CreateCollectionAsync(CollName, new VectorParams { Size = 384, Distance = Distance.Cosine });

            using var conn = await db.OpenConnectionAsync();
            var records = await conn.QueryAsync("SELECT booking_id, unified_cancellation_reason FROM gold.dataset WHERE unified_cancellation_reason IS NOT NULL");

            foreach (var item in records)
            {
                var vector = await embedder.GetVectorAsync(item.unified_cancellation_reason);

                var point = new PointStruct
                {
                    Id = Guid.Parse(ToGuid(item.booking_id.ToString())),
                    Vectors = vector,
                    Payload = { ["reason"] = (string)item.unified_cancellation_reason, ["booking_id"] = (string)item.booking_id }
                };
                await client.UpsertAsync(CollName, new[] { point });
            }
            logger.LogInformation("Qdrant is Up-to-date.");
        }

        private string ToGuid(string id) =>
            System.Security.Cryptography.MD5.HashData(System.Text.Encoding.UTF8.GetBytes(id))
            .Select(b => b.ToString("x2")).Aggregate((a, b) => a + b).Insert(8, "-").Insert(13, "-").Insert(18, "-").Insert(23, "-");
    }
}
