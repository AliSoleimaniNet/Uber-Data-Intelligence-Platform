using Npgsql;
using Dapper;

namespace UberApi.Data
{
    public class DatabaseInitializer(NpgsqlDataSource dataSource)
    {
        public async Task InitializeDatabaseAsync()
        {
            await using var conn = await dataSource.OpenConnectionAsync();

            var sql = @"
                 CREATE SCHEMA IF NOT EXISTS bronze;
                 CREATE SCHEMA IF NOT EXISTS silver;
                 CREATE SCHEMA IF NOT EXISTS gold;
                 CREATE SCHEMA IF NOT EXISTS logging;
    
                 CREATE TABLE IF NOT EXISTS logging.pipeline_status (
                     batch_id UUID,
                     step TEXT,
                     status TEXT,
                     start_time TIMESTAMP,
                     end_time TIMESTAMP,
                     rows_imported INT,
                     error_message TEXT,
                     PRIMARY KEY (batch_id, step)
                 );

                 CREATE TABLE IF NOT EXISTS bronze.raw_dataset (
                     _id BIGSERIAL PRIMARY KEY,
                     _batch_id UUID,
                     _ingested_at TIMESTAMP DEFAULT NOW(),
                     ride_date DATE,               
                     ride_time TEXT,              
                     booking_id TEXT, 
                     booking_status TEXT, 
                     customer_id TEXT, 
                     vehicle_type TEXT,
                     cancelled_by_customer BOOLEAN, 
                     reason_customer TEXT,
                     cancelled_by_driver BOOLEAN,   
                     driver_reason TEXT,
                     incomplete_rides BOOLEAN,      
                     incomplete_reason TEXT,
                     booking_value DOUBLE PRECISION, 
                     ride_distance DOUBLE PRECISION,
                     driver_ratings DOUBLE PRECISION, 
                     customer_rating DOUBLE PRECISION,
                     payment_method TEXT
                 );

                 CREATE TABLE IF NOT EXISTS silver.cleaned_dataset (
                     id BIGSERIAL PRIMARY KEY,
                     _batch_id UUID,
                     ride_timestamp TIMESTAMP,
                     booking_id TEXT,
                     booking_status TEXT,
                     customer_id TEXT,
                     vehicle_type TEXT,
                     unified_cancellation_reason TEXT, 
                     booking_value DOUBLE PRECISION,  
                     ride_distance DOUBLE PRECISION,
                     driver_ratings DOUBLE PRECISION,  
                     customer_rating DOUBLE PRECISION,
                     payment_method TEXT,
                     _processed_at TIMESTAMP DEFAULT NOW()
                 );

                 CREATE TABLE IF NOT EXISTS gold.dataset (
                     booking_id TEXT PRIMARY KEY,
                     _batch_id UUID,
                     ride_timestamp TIMESTAMP,
                     booking_status TEXT,
                     customer_id TEXT,
                     vehicle_type TEXT,
                     unified_cancellation_reason TEXT,
                     booking_value DOUBLE PRECISION,
                     ride_distance DOUBLE PRECISION,
                     revenue_per_km DOUBLE PRECISION, 
                     driver_ratings DOUBLE PRECISION,
                     customer_rating DOUBLE PRECISION,
                     payment_method TEXT,
                     
                     CONSTRAINT check_driver_rating CHECK (driver_ratings >= 0 AND driver_ratings <= 5),
                     CONSTRAINT check_customer_rating CHECK (customer_rating >= 0 AND customer_rating <= 5)
                 );";

            await conn.ExecuteAsync(sql);
        }
    }
}
