namespace UberApi.Domain
{
    public class DashboardKpiDto
    {
        public DashboardKpiDto() { TotalBookings = 0; SuccessfulBookings = 0; TotalRevenue = 0; SuccessRate = 0; }

        public long TotalBookings { get; set; }
        public long SuccessfulBookings { get; set; }
        public double TotalRevenue { get; set; }
        public decimal SuccessRate { get; set; }
    }
}
