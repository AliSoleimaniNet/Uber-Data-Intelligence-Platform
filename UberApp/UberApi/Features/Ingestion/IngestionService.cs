using CsvHelper;
using Dapper;
using Hangfire;
using Npgsql;
using System.Formats.Asn1;
using System.Globalization;
using UberApi.Data;
using UberApi.Domain;

namespace UberApi.Features.Ingestion
{
    public class IngestionService(NpgsqlDataSource dataSource, IBackgroundJobClient backgroundJobs)
    {
        public async Task<Guid> EnqueueIngestionAsync(string filePath, string originalFileName)
        {
            var batchId = Guid.NewGuid();

            await using var conn = await dataSource.OpenConnectionAsync();
            await conn.ExecuteAsync(
                "INSERT INTO logging.pipeline_status (batch_id, step, status, start_time) VALUES (@batchId, 'Bronze', 'Processing', @Now)",
                new { batchId, Now = DateTime.UtcNow });

            backgroundJobs.Enqueue<IngestionService>(s => s.ExecuteBinaryImport(batchId, filePath));

            return batchId;
        }

        public async Task ExecuteBinaryImport(Guid batchId, string filePath)
        {
            int rowCount = 0;
            try
            {
                await using var conn = await dataSource.OpenConnectionAsync();
                using var reader = new StreamReader(filePath);
                using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

                using (var writer = await conn.BeginBinaryImportAsync(
                    @"COPY bronze.raw_dataset (
                        _batch_id, ride_date, ride_time, booking_id, booking_status, 
                        customer_id, vehicle_type, cancelled_by_customer, reason_customer, 
                        cancelled_by_driver, driver_reason, incomplete_rides, incomplete_reason, 
                        booking_value, ride_distance, driver_ratings, customer_rating, payment_method
                    ) FROM STDIN (FORMAT BINARY)"))
                {
                    await csv.ReadAsync();
                    csv.ReadHeader();

                    while (await csv.ReadAsync())
                    {
                        await writer.StartRowAsync();
                        await writer.WriteAsync(batchId); 

                        await writer.WriteAsync(ParseDate(csv.GetField(0)!));  // Date 
                        await writer.WriteAsync(csv.GetField(1));              // Time (String)
                        await writer.WriteAsync(csv.GetField(2));              // Booking ID
                        await writer.WriteAsync(csv.GetField(3));              // Status
                        await writer.WriteAsync(csv.GetField(4));              // Customer ID
                        await writer.WriteAsync(csv.GetField(5));              // Vehicle Type

                        await writer.WriteAsync(ParseBoolean(csv.GetField(6)!)); // Cancelled by Cust
                        await writer.WriteAsync(csv.GetField(7));              // Reason
                        await writer.WriteAsync(ParseBoolean(csv.GetField(8)!)); // Cancelled by Driver
                        await writer.WriteAsync(csv.GetField(9));              // Driver Reason
                        await writer.WriteAsync(ParseBoolean(csv.GetField(10)!));// Incomplete
                        await writer.WriteAsync(csv.GetField(11));             // Incomplete Reason
                        await writer.WriteAsync(ParseDouble(csv.GetField(12)!));// Value 
                        await writer.WriteAsync(ParseDouble(csv.GetField(13)!));// Distance
                        await writer.WriteAsync(ParseDouble(csv.GetField(14)!));// Driver Rating
                        await writer.WriteAsync(ParseDouble(csv.GetField(15)!));// Cust Rating

                        await writer.WriteAsync(csv.GetField(16));             // Payment Method

                        rowCount++;
                    }
                    await writer.CompleteAsync();
                }
                await UpdateStepStatus(batchId, "Bronze", "Success", rowCount, null);

                backgroundJobs.Enqueue<IngestionService>(s => s.ProcessSilverAsync(batchId));
            }
            catch (Exception ex)
            {
                await UpdateStepStatus(batchId, "Bronze", "Failed", rowCount, ex.Message);
            }
            finally { if (File.Exists(filePath)) File.Delete(filePath); }
        }

        private bool? ParseBoolean(string value)
        {
            if (string.IsNullOrWhiteSpace(value) || value.Trim().ToLower() == "null")
                return null;

            return value == "1";
        }

        private double? ParseDouble(string value)
        {
            if (string.IsNullOrWhiteSpace(value) || value.Trim().ToLower() == "null")
                return null;

            return double.TryParse(value, out double result) ? result : null;
        }

        private DateOnly? ParseDate(string value)
        {
            if (string.IsNullOrWhiteSpace(value) || value.Trim().ToLower() == "null")
                return null;

            return DateOnly.TryParse(value, out DateOnly result) ? result : null;
        }

        public async Task ProcessSilverAsync(Guid batchId)
        {
            try
            {
                await using var conn = await dataSource.OpenConnectionAsync();

                await conn.ExecuteAsync(
                    @"UPDATE logging.pipeline_status 
                      SET step = 'Silver', 
                          status = 'Processing', 
                          error_message = NULL 
                      WHERE batch_id = @batchId",
                    new { batchId });

                await conn.ExecuteAsync("DELETE FROM silver.cleaned_dataset WHERE _batch_id = @batchId", new { batchId });

                var silverSql = @"
                    INSERT INTO silver.cleaned_dataset (
                        _batch_id, 
                        ride_timestamp,
                        booking_id, 
                        booking_status, 
                        customer_id, 
                        vehicle_type, 
                        unified_cancellation_reason,
                        booking_value, 
                        ride_distance, 
                        driver_ratings, 
                        customer_rating,
                        payment_method
                    )
                    SELECT 
                        _batch_id,
                        (ride_date + ride_time::time)::timestamp as ride_timestamp,
                        
                        TRIM(booking_id),
                        TRIM(booking_status),
                        TRIM(customer_id),
                        TRIM(vehicle_type),

                        CASE 
                            WHEN booking_status = 'Cancelled by Customer' THEN reason_customer
                            WHEN booking_status = 'Cancelled by Driver' THEN driver_reason
                            WHEN booking_status = 'Incomplete' THEN incomplete_reason
                            ELSE 'Not Cancelled'
                        END as unified_cancellation_reason,

                        COALESCE(booking_value, 0),
                        COALESCE(ride_distance, 0),

                        driver_ratings,
                        customer_rating,

                        CASE 
                            WHEN payment_method IS NULL OR LOWER(TRIM(payment_method)) = 'null' THEN 'Not Specified'
                            ELSE TRIM(payment_method)
                        END as payment_method

                    FROM bronze.raw_dataset
                    WHERE _batch_id = @batchId 
                      AND booking_id IS NOT NULL 
                      AND booking_id <> 'null';";

                var affectedRows = await conn.ExecuteAsync(silverSql, new { batchId });

                await UpdateStepStatus(batchId, "Silver", "Success", affectedRows, null);

                 backgroundJobs.Enqueue<IngestionService>(s => s.ProcessGoldAsync(batchId));
            }
            catch (Exception ex)
            {
                await UpdateStepStatus(batchId, "Silver", "Failed", 0, ex.Message);
            }
        }

        public async Task ProcessGoldAsync(Guid batchId)
        {
            try
            {
                await using var conn = await dataSource.OpenConnectionAsync();


                await conn.ExecuteAsync(
                    @"UPDATE logging.pipeline_status 
                      SET step = 'Gold', 
                          status = 'Processing', 
                          error_message = NULL 
                      WHERE batch_id = @batchId",
                    new { batchId });

                await conn.ExecuteAsync("DELETE FROM gold.dataset WHERE _batch_id = @batchId", new { batchId });

                var goldSql = @"
                    INSERT INTO gold.dataset (
                        booking_id,
                        _batch_id, 
                        ride_timestamp, 
                        booking_status, 
                        customer_id, 
                        vehicle_type, 
                        unified_cancellation_reason, 
                        booking_value, 
                        ride_distance, 
                        revenue_per_km, 
                        driver_ratings, 
                        customer_rating, 
                        payment_method
                    )
                    SELECT 
                        TRIM(BOTH '""' FROM TRIM(booking_id)), 
                        _batch_id,
                        ride_timestamp,
                        TRIM(BOTH '""' FROM TRIM(booking_status)),
                        TRIM(BOTH '""' FROM TRIM(customer_id)),
                        TRIM(BOTH '""' FROM TRIM(vehicle_type)),
                        unified_cancellation_reason,
                        booking_value,
                        ride_distance,
                        CASE WHEN ride_distance > 0 THEN (booking_value / ride_distance) ELSE 0 END,
                        driver_ratings,
                        customer_rating,
                        TRIM(BOTH '""' FROM TRIM(payment_method))
                    FROM silver.cleaned_dataset
                    WHERE _batch_id = @batchId
                    ON CONFLICT (booking_id) DO NOTHING;";

                var affectedRows = await conn.ExecuteAsync(goldSql, new { batchId });

                await UpdateStepStatus(batchId, "Gold", "Success", affectedRows, null);
            }
            catch (Exception ex)
            {
                await UpdateStepStatus(batchId, "Gold", "Failed", 0, ex.Message);
            }
        }

        private async Task UpdateStepStatus(Guid batchId, string step, string status, int count, string? error)
        {
            DateTime? endtime = (status == "Success" || status == "Failed") ? DateTime.UtcNow : null;

            await using var conn = await dataSource.OpenConnectionAsync();
            await conn.ExecuteAsync(
                @"UPDATE logging.pipeline_status 
                    SET status = @status, rows_imported = @count, end_time = @endtime, error_message = @error, step = @step
                    WHERE batch_id = @batchId",
                new { status, count, endtime, error, step, batchId });
        }
        private record ResumePipelineGetting(string step, string status);
        public async Task ResumePipelineAsync(Guid batchId)
        {
            await using var conn = await dataSource.OpenConnectionAsync();
            
            var lastStatus = await conn.QueryFirstOrDefaultAsync<ResumePipelineGetting>(
                "SELECT step, status FROM logging.pipeline_status WHERE batch_id = @batchId ORDER BY start_time DESC LIMIT 1",
                new { batchId });

            if (lastStatus == null)
                throw new Exception("Pipeline not found.");

            string step = lastStatus.step;
            string status = lastStatus.status;

            if (status != "Failed" || step == "Bronze")
                return;

            switch (step)
            {
                case "Silver":
                    backgroundJobs.Enqueue<IngestionService>(s => s.ProcessSilverAsync(batchId));
                    break;

                case "Gold":
                    backgroundJobs.Enqueue<IngestionService>(s => s.ProcessGoldAsync(batchId));
                    break;
            }
        }
        public async Task<PagedResult<IngestionStatus>> GetPagedRunsAsync(int pageNumber, int pageSize)
        {
            var offset = (pageNumber - 1) * pageSize;
            await using var conn = await dataSource.OpenConnectionAsync();

            var sql = @"
                    SELECT COUNT(*) FROM logging.pipeline_status;
                    SELECT batch_id as BatchId, step as Step, status as Status, 
                           start_time as StartTime, end_time as EndTime, 
                           rows_imported as RowsImported, error_message as Error
                    FROM logging.pipeline_status 
                    ORDER BY start_time DESC 
                    LIMIT @PageSize OFFSET @Offset";

            using var multi = await conn.QueryMultipleAsync(sql, new { PageSize = pageSize, Offset = offset });
            var totalCount = await multi.ReadFirstAsync<int>();
            var items = await multi.ReadAsync<IngestionStatus>();

            return new PagedResult<IngestionStatus>() {Items = items, TotalCount = totalCount, Page = pageNumber, PageSize = pageSize };
        }
    }

}
