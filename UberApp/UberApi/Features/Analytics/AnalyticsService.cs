using Dapper;
using Npgsql;
using UberApi.Domain;

namespace UberApi.Features.Analytics
{
    public class AnalyticsService
    {
        private readonly NpgsqlDataSource _dataSource;
        public AnalyticsService(NpgsqlDataSource dataSource) => _dataSource = dataSource;

        private string GetFilters(string? vehicleType, DateTime? start, DateTime? end)
        {
            var filters = " WHERE 1=1 ";
            if (!string.IsNullOrEmpty(vehicleType)) filters += " AND vehicle_type = @Vehicle ";
            if (start.HasValue) filters += " AND ride_timestamp >= @Start ";
            if (end.HasValue) filters += " AND ride_timestamp <= @End ";
            return filters;
        }

        public async Task<DashboardKpiDto> GetKpisAsync(string? vehicleType, DateTime? start, DateTime? end)
        {
            await using var conn = await _dataSource.OpenConnectionAsync();
            var sql = $@"
            SELECT 
                COUNT(*) as TotalBookings,
                COUNT(*) FILTER (WHERE booking_status = 'Completed') as SuccessfulBookings,
                COALESCE(SUM(booking_value), 0) as TotalRevenue,
                CASE WHEN COUNT(*) > 0 
                     THEN ROUND((COUNT(*) FILTER (WHERE booking_status = 'Completed')::numeric / COUNT(*)) * 100, 2) 
                     ELSE 0 END as SuccessRate
            FROM gold.dataset {GetFilters(vehicleType, start, end)}";

            return await conn.QueryFirstAsync<DashboardKpiDto>(sql, new { Vehicle = vehicleType, Start = start, End = end });
        }

        public async Task<IEnumerable<object>> GetCancellationAnalysisAsync(string? vehicleType, DateTime? start, DateTime? end)
        {
            await using var conn = await _dataSource.OpenConnectionAsync();
            var sql = $@"
            SELECT unified_cancellation_reason as Reason, COUNT(*) as Count 
            FROM gold.dataset 
            {GetFilters(vehicleType, start, end)}
            AND unified_cancellation_reason <> 'Not Cancelled'
            GROUP BY unified_cancellation_reason";
            return await conn.QueryAsync(sql, new { Vehicle = vehicleType, Start = start, End = end });
        }

        public async Task<IEnumerable<object>> GetVehiclePerformanceAsync(string? vehicleType, DateTime? start, DateTime? end)
        {
            await using var conn = await _dataSource.OpenConnectionAsync();
            var sql = $@"
            SELECT 
                vehicle_type as VehicleType, 
                COUNT(*) as TotalRides,
                ROUND(AVG(customer_rating)::numeric, 2) as AvgRating
            FROM gold.dataset
            {GetFilters(vehicleType, start, end)}
            GROUP BY vehicle_type";
            return await conn.QueryAsync(sql, new { Vehicle = vehicleType, Start = start, End = end });
        }

        public async Task<IEnumerable<object>> GetHourlyTrafficAsync(string? vehicleType, DateTime? start, DateTime? end)
        {
            await using var conn = await _dataSource.OpenConnectionAsync();
            var sql = $@"
            SELECT 
                EXTRACT(HOUR FROM ride_timestamp) as Hour, 
                COUNT(*) as RideCount
            FROM gold.dataset
            {GetFilters(vehicleType, start, end)}
            GROUP BY Hour
            ORDER BY Hour";
            return await conn.QueryAsync(sql, new { Vehicle = vehicleType, Start = start, End = end });
        }
    }
}
