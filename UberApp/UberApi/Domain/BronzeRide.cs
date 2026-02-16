namespace UberApi.Domain
{
    public record BronzeRide(
    string Date, string Time, string BookingId, string BookingStatus,
    string CustomerId, string VehicleType, double? CancelledByCustomer,
    string? ReasonCustomer, double? CancelledByDriver, string? DriverReason,
    double? IncompleteRides, string? IncompleteReason, double? BookingValue,
    double? RideDistance, double? DriverRatings, double? CustomerRating,
    string? PaymentMethod);
}
