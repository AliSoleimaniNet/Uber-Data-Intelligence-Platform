using System.Text.Json;

namespace UberApi.Features.QdrantSync
{
    public class EmbeddingService(IHttpClientFactory clientFactory)
    {
        private readonly string _ollamaUrl = "http://localhost:11434/api/embeddings";

        public async Task<float[]> GetVectorAsync(string text)
        {
            using var client = clientFactory.CreateClient();
            var payload = new { model = "all-minilm", prompt = text }; 

            var response = await client.PostAsJsonAsync(_ollamaUrl, payload);
            var result = await response.Content.ReadFromJsonAsync<JsonElement>();

            return result.GetProperty("embedding").EnumerateArray()
                         .Select(x => (float)x.GetDouble()).ToArray();
        }
    }
}
