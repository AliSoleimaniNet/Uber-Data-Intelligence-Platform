using Microsoft.AspNetCore.Mvc;
using UberApi.Domain;

namespace UberApi.Features.Rides
{
    [ApiController]
    [Route("api/[controller]")]
    public class RideController : ControllerBase
    {
        private readonly RidesService _service;
        public RideController(RidesService service) => _service = service;

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] RideFilter filter)
            => Ok(await _service.GetRidesAsync(filter));

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateRideRequest req)
        {
            var ride = new GoldRide
            {
                BookingId = "", 
                BookingStatus = "",
                RideTimestamp = req.RideTimestamp ?? DateTime.UtcNow,
                CustomerId = req.CustomerId,
                VehicleType = req.VehicleType,
                UnifiedCancellationReason = "",
                BookingValue = req.BookingValue,
                RideDistance = req.RideDistance,
                DriverRatings = req.DriverRatings,
                CustomerRating = req.CustomerRating,
                PaymentMethod = req.PaymentMethod
            };

            var id = await _service.AddRideAsync(ride);
            return Ok(id);
        }

        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateStatus(string id, [FromBody] UpdateStatusRequest req)
        {
            var success = await _service.UpdateRideStatusAsync(id, req.Status, req.Reason);
            return success ? Ok() : NotFound();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var success = await _service.DeleteRideAsync(id);
            return success ? Ok() : NotFound();
        }
    }
}
