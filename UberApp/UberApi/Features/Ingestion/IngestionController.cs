using Microsoft.AspNetCore.Mvc;
using Npgsql;
using UberApi.Domain;

namespace UberApi.Features.Ingestion
{
    [ApiController]
    [Route("api/[controller]")]
    public class IngestionController(
    IngestionService ingestionService,
    ILogger<IngestionController> logger) : ControllerBase
    {
        [HttpPost("upload")]
        [DisableRequestSizeLimit]
        public async Task<IActionResult> UploadBronze(IFormFile file)
        {
            if (file is not { Length: > 0 })
                return BadRequest("لطفاً یک فایل CSV معتبر انتخاب کنید.");

            if (!Path.GetExtension(file.FileName).Equals(".csv", StringComparison.OrdinalIgnoreCase))
                return BadRequest("فقط فایل‌های CSV مجاز هستند.");

            try
            {
                var tempPath = Path.Combine(Path.GetTempPath(), "UberUploads", $"{Guid.NewGuid()}.csv");
                Directory.CreateDirectory(Path.GetDirectoryName(tempPath)!);

                await using (var stream = new FileStream(tempPath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                var batchId = await ingestionService.EnqueueIngestionAsync(tempPath, file.FileName);

                return Ok(new
                {
                    BatchId = batchId,
                    Message = "پردازش لایه Bronze آغاز گردید.",
                });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error starting ingestion for {FileName}", file.FileName);
                return StatusCode(500, "خطای داخلی در شروع فرآیند بارگذاری.");
            }
        }
        
        [HttpPost("resume/{batchId}")]
        public async Task<IActionResult> Resume(Guid batchId)
        {
            await ingestionService.ResumePipelineAsync(batchId);
            return Ok();
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetHistory([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            if (page < 1 || pageSize < 1) return BadRequest("پارامترهای صفحه بندی معتبر نیستند.");

            var result = await ingestionService.GetPagedRunsAsync(page, pageSize);
            
            return Ok(result);
        }
    }
}
