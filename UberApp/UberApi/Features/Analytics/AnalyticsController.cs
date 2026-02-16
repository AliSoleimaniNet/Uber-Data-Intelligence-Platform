using Microsoft.AspNetCore.Mvc;

namespace UberApi.Features.Analytics
{
    [ApiController]
    [Route("api/[controller]")]
    public class AnalyticsController : ControllerBase
    {
        private readonly AnalyticsService _analyticsService;
        public AnalyticsController(AnalyticsService analyticsService) => _analyticsService = analyticsService;

        [HttpGet("dashboard-summary")]
        public async Task<IActionResult> GetSummary(
            [FromQuery] string? vehicleType,
            [FromQuery] DateTime? start,
            [FromQuery] DateTime? end)
        {
            var kpiTask = _analyticsService.GetKpisAsync(vehicleType, start, end);
            var cancellationTask = _analyticsService.GetCancellationAnalysisAsync(vehicleType, start, end);
            var performanceTask = _analyticsService.GetVehiclePerformanceAsync(vehicleType, start, end);
            var trafficTask = _analyticsService.GetHourlyTrafficAsync(vehicleType, start, end);

            await Task.WhenAll(kpiTask, cancellationTask, performanceTask, trafficTask);

            return Ok(new
            {
                Kpis = kpiTask.Result,
                CancellationData = cancellationTask.Result,
                VehicleData = performanceTask.Result,
                TrafficData = trafficTask.Result
            });
        }
    }
}
