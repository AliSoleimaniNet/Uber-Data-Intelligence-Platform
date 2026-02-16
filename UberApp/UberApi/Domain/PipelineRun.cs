using System.ComponentModel.DataAnnotations;

namespace UberApi.Domain
{
    public class PipelineStatus
    {
        public Guid BatchId { get; set; }
        public string Step { get; set; } = "Bronze"; // Bronze, Silver, Gold
        public string Status { get; set; } = "Processing"; // Processing, Success, Failed
        public DateTime StartTime { get; set; } = DateTime.UtcNow;
        public DateTime? EndTime { get; set; }
        public int RowsImported { get; set; }
        public string? ErrorMessage { get; set; }
    }
}
