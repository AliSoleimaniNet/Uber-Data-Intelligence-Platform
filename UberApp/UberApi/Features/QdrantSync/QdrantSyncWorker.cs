using Dapper;
using Npgsql;
using Qdrant.Client;
using Qdrant.Client.Grpc;
using System.Collections.Concurrent;

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
                catch (Exception ex) { logger.LogError(ex, "Sync failed"); }

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
            var dbData = (await conn.QueryAsync<(string BookingId, string Reason)>(
                "SELECT booking_id, unified_cancellation_reason FROM gold.dataset WHERE unified_cancellation_reason != 'Not Cancelled'"))
                .ToList();

            var dbGuids = dbData.Select(x => Guid.Parse(ToGuid(x.BookingId))).ToHashSet();

            var qdrantIds = new HashSet<Guid>();
            PointId? nextOffset = null;
            do
            {
                var scrollResult = await client.ScrollAsync(CollName, limit: 10000, offset: nextOffset);
                foreach (var point in scrollResult.Result)
                {
                    if (Guid.TryParse(point.Id.Uuid, out var g)) qdrantIds.Add(g);
                }
                nextOffset = scrollResult.NextPageOffset;
            } while (nextOffset != null);

            var idsToDelete = qdrantIds.Where(id => !dbGuids.Contains(id)).ToList();

            if (idsToDelete.Count > 0 && idsToDelete.Count == qdrantIds.Count && dbGuids.Count > 0)
            {
                logger.LogWarning("Safety check triggered: Sync aborted to prevent full deletion.");
            }
            else if (idsToDelete.Any())
            {
                await client.DeleteAsync(CollName, idsToDelete);
                logger.LogInformation("Deleted {Count} orphaned records.", idsToDelete.Count);
            }

            var itemsToSync = dbData.Where(x => !qdrantIds.Contains(Guid.Parse(ToGuid(x.BookingId)))).ToList();

            if (!itemsToSync.Any())
            {
                logger.LogInformation("Sync complete: No new records.");
                return;
            }

            logger.LogInformation("Embedding {Count} new records...", itemsToSync.Count);

            var syncTasks = new ConcurrentBag<PointStruct>();

            await Parallel.ForEachAsync(itemsToSync, new ParallelOptions { MaxDegreeOfParallelism = 10 }, async (item, ct) =>
            {
                try
                {
                    var vector = await embedder.GetVectorAsync(item.Reason);
                    syncTasks.Add(new PointStruct
                    {
                        Id = Guid.Parse(ToGuid(item.BookingId)),
                        Vectors = vector,
                        Payload = { ["reason"] = item.Reason, ["booking_id"] = item.BookingId }
                    });
                }
                catch (Exception ex) { logger.LogError("Embedding error for {Id}: {Msg}", item.BookingId, ex.Message); }
            });

            var pointsList = syncTasks.ToList();
            for (int i = 0; i < pointsList.Count; i += 1000)
            {
                var batch = pointsList.Skip(i).Take(1000).ToList();
                await client.UpsertAsync(CollName, batch);
            }

            logger.LogInformation("Sync successful. Active records: {Count}", dbData.Count);
        }

        private string ToGuid(string id) =>
            System.Security.Cryptography.MD5.HashData(System.Text.Encoding.UTF8.GetBytes(id))
            .Select(b => b.ToString("x2")).Aggregate((a, b) => a + b).Insert(8, "-").Insert(13, "-").Insert(18, "-").Insert(23, "-");
    }
}
