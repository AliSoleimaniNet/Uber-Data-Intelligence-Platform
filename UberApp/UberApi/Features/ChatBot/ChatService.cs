using Dapper;
using Npgsql;
using System.Data;
using System.Text.Json;
using System.Text.RegularExpressions;
using UberApi.Domain;

namespace UberApi.Features.ChatBot
{
    public class ChatService(NpgsqlDataSource dataSource, ILogger<ChatService> logger)
    {
        private readonly string _ollamaUrl = "http://localhost:11434/api/generate";
        private readonly string _modelName = "uber-sql-helper";

        public async Task<ChatResponse> ProcessUserQueryAsync(string userPrompt)
        {
            try
            {
                string generatedSql = await GetSqlFromAi(userPrompt);

                if (string.IsNullOrWhiteSpace(generatedSql))
                    return new ChatResponse { Success = false, Message = "متأسفانه متوجه سوال شما نشدم یا ورودی نامعتبر است." };

                var validation = ValidateAndCleanSql(generatedSql);
                if (!validation.IsValid)
                    return new ChatResponse { Success = false, Message = validation.ErrorMessage };

                var result = await ExecuteDynamicSql(validation.SanitizedSql);

                return new ChatResponse
                {
                    Success = true,
                    Data = result,
                    Message = "تحلیل با موفقیت انجام شد."
                };
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error in ChatService");
                return new ChatResponse { Success = false, Message = "خطایی در پردازش درخواست رخ داد." };
            }
        }

        private async Task<string> GetSqlFromAi(string prompt)
        {
            using var client = new HttpClient();
            var requestBody = new { model = _modelName, prompt = prompt, stream = false };
            var response = await client.PostAsJsonAsync(_ollamaUrl, requestBody);

            if (!response.IsSuccessStatusCode) return string.Empty;

            var json = await response.Content.ReadFromJsonAsync<JsonElement>();
            return json.GetProperty("response").GetString()?.Trim() ?? "";
        }

        private (bool IsValid, string SanitizedSql, string ErrorMessage) ValidateAndCleanSql(string sql)
        {
            string cleanedSql = sql.Replace("```sql", "").Replace("```", "").Trim();

            if (!cleanedSql.StartsWith("SELECT", StringComparison.OrdinalIgnoreCase))
                return (false, "", "شما فقط مجاز به پرسیدن سوالات تحلیلی (SELECT) هستید.");

            string[] forbiddenWords = { "INSERT", "UPDATE", "DELETE", "DROP", "TRUNCATE", "ALTER", "CREATE", "GRANT", "REVOKE", "pg_" };
            foreach (var word in forbiddenWords)
            {
                if (Regex.IsMatch(cleanedSql, $@"\b{word}\b", RegexOptions.IgnoreCase))
                    return (false, "", $"دستور غیرمجاز شناسایی شد: {word}");
            }

            if (!Regex.IsMatch(cleanedSql, @"\bLIMIT\b", RegexOptions.IgnoreCase))
            {
                cleanedSql = cleanedSql.TrimEnd(';') + " LIMIT 10;";
            }

            return (true, cleanedSql, "");
        }

        private async Task<object> ExecuteDynamicSql(string sql)
        {
            await using var conn = await dataSource.OpenConnectionAsync();

            var results = await conn.QueryAsync(sql);

            return results.Select(row => (IDictionary<string, object>)row).ToList();
        }
    }
}
