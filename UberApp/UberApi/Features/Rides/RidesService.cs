using Dapper;
using Npgsql;
using Qdrant.Client;
using UberApi.Domain;
using UberApi.Features.QdrantSync;

namespace UberApi.Features.Rides
{
    public class RidesService
    {
        private readonly NpgsqlDataSource _dataSource;
        private readonly EmbeddingService _embeddingService;
        private readonly QdrantClient _qdrantClient;
        public RidesService(NpgsqlDataSource dataSource, QdrantClient qdrantClient, EmbeddingService embeddingService)
        {
            _dataSource = dataSource;
            _qdrantClient = qdrantClient;
            _embeddingService = embeddingService;
        }

        public async Task<PagedResult<GoldRide>> GetRidesAsync(RideFilter filter)
        {
            await using var conn = await _dataSource.OpenConnectionAsync();

            List<string>? semanticIds = null;

            if (!string.IsNullOrWhiteSpace(filter.SemanticSearch))
            {
                var queryVector = await _embeddingService.GetVectorAsync(filter.SemanticSearch);

                var searchResult = await _qdrantClient.SearchAsync(
                    collectionName: "uber_cancellations",
                    vector: queryVector,
                    limit: 5 
                );

                semanticIds = searchResult.Select(hit => hit.Payload["booking_id"].StringValue).ToList();

                if (!semanticIds.Any())
                    return new PagedResult<GoldRide> { Page = filter.PageNumber, PageSize = filter.PageSize };
            }

            int offset = (filter.PageNumber - 1) * filter.PageSize;

            string semanticFilterSql = semanticIds != null ? " AND booking_id = ANY(@SemanticIds)" : "";

            var countSql = $@"
                SELECT COUNT(*) FROM gold.dataset
                WHERE (@Status IS NULL OR booking_status = @Status)
                  AND (@Vehicle IS NULL OR vehicle_type = @Vehicle)
                  AND (@CustomerId IS NULL OR customer_id = @CustomerId)
                  {semanticFilterSql}";

            var dataSql = $@"
                SELECT booking_id as BookingId, ride_timestamp as RideTimestamp, 
                       booking_status as BookingStatus, customer_id as CustomerId, 
                       vehicle_type as VehicleType, unified_cancellation_reason as UnifiedCancellationReason,
                       booking_value as BookingValue, ride_distance as RideDistance,
                       revenue_per_km as RevenuePerKm, driver_ratings as DriverRatings,
                       customer_rating as CustomerRating, payment_method as PaymentMethod
                FROM gold.dataset
                WHERE (@Status IS NULL OR booking_status = @Status)
                  AND (@Vehicle IS NULL OR vehicle_type = @Vehicle)
                  AND (@CustomerId IS NULL OR customer_id = @CustomerId)
                  {semanticFilterSql}
                ORDER BY ride_timestamp DESC
                LIMIT @PageSize OFFSET @Offset";

            var parameters = new
            {
                Status = filter.Status,
                Vehicle = filter.Vehicle,
                CustomerId = filter.CustomerId,
                SemanticIds = semanticIds, 
                PageSize = filter.PageSize,
                Offset = offset
            };

            var totalRecords = await conn.ExecuteScalarAsync<int>(countSql, parameters);
            var data = await conn.QueryAsync<GoldRide>(dataSql, parameters);

            return new PagedResult<GoldRide>()
            {
                Items = data,
                TotalCount = totalRecords,
                Page = filter.PageNumber,
                PageSize = filter.PageSize
            };
        }

        public async Task<string> AddRideAsync(GoldRide ride)
        {
            ride.BookingId = "BOK-" + Guid.NewGuid().ToString("N").Substring(0, 10).ToUpper();
            ride.BookingStatus = "Completed";
            ride.UnifiedCancellationReason = "Not Cancelled";

            if (ride.RideDistance > 0)
                ride.RevenuePerKm = ride.BookingValue / ride.RideDistance;

            await using var conn = await _dataSource.OpenConnectionAsync();
            var sql = @"
            INSERT INTO gold.dataset 
            (booking_id, ride_timestamp, booking_status, customer_id, vehicle_type, 
             unified_cancellation_reason, booking_value, ride_distance, revenue_per_km, 
             driver_ratings, customer_rating, payment_method)
            VALUES 
            (@BookingId, @RideTimestamp, @BookingStatus, @CustomerId, @VehicleType, 
             @UnifiedCancellationReason, @BookingValue, @RideDistance, @RevenuePerKm, 
             @DriverRatings, @CustomerRating, @PaymentMethod)";

            await conn.ExecuteAsync(sql, ride);
            return ride.BookingId;
        }

        public async Task<bool> UpdateRideStatusAsync(string bookingId, string newStatus, string? reason)
        {
            await using var conn = await _dataSource.OpenConnectionAsync();
            var sql = @"UPDATE gold.dataset 
                    SET booking_status = @newStatus, 
                        unified_cancellation_reason = @reason 
                    WHERE booking_id = @bookingId";
            return await conn.ExecuteAsync(sql, new { bookingId, newStatus, reason }) > 0;
        }

        public async Task<bool> DeleteRideAsync(string bookingId)
        {
            await using var conn = await _dataSource.OpenConnectionAsync();
            return await conn.ExecuteAsync("DELETE FROM gold.dataset WHERE booking_id = @bookingId", new { bookingId }) > 0;
        }
    }
}
