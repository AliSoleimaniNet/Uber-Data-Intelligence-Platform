namespace UberApi.Domain
{
    public class IngestionStatus
    {
        public Guid BatchId { get; set; }
        public string Step { get; set; } = "";
        public string Status { get; set; } = "";
        public DateTime StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public int RowsImported { get; set; }
        public string? Error { get; set; }
    }
}
