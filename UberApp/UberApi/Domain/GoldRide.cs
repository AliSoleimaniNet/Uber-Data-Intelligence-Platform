namespace UberApi.Domain
{
    public class GoldRide
    {
        public required string BookingId { get; set; }
        public required DateTime RideTimestamp { get; set; }
        public required string BookingStatus { get; set; }
        public required string CustomerId { get; set; }
        public required string VehicleType { get; set; }
        public required string UnifiedCancellationReason { get; set; }
        public double BookingValue { get; set; }
        public double RideDistance { get; set; }
        public double RevenuePerKm { get; set; }
        public double? DriverRatings { get; set; }
        public double? CustomerRating { get; set; }
        public string? PaymentMethod { get; set; }
    }
    public record RideFilter(string? Status, string? Vehicle, string? CustomerId, string? SemanticSearch, int PageNumber = 1, int PageSize = 20);

    public record UpdateStatusRequest(string Status, string? Reason);

    public record CreateRideRequest(
        string CustomerId,
        string VehicleType,
        double BookingValue,
        double RideDistance,
        DateTime? RideTimestamp = null,
        double? DriverRatings = null,
        double? CustomerRating = null,
        string? PaymentMethod = null
    );
}
