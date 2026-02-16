using Microsoft.AspNetCore.Mvc;
using UberApi.Domain;

namespace UberApi.Features.ChatBot
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController(ChatService chatService) : ControllerBase
    {
        [HttpPost("ask")]
        public async Task<IActionResult> Ask([FromBody] ChatRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Prompt))
                return BadRequest("لطفاً سوال خود را وارد کنید.");

            var response = await chatService.ProcessUserQueryAsync(request.Prompt);

            if (!response.Success)
                return BadRequest(new { error = response.Message });

            return Ok(response);
        }
    }
}
