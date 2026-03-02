/** Injectable Claude API client — mock this interface in tests. */
export interface ClaudeClient {
  complete(systemPrompt: string, userMessage: string): Promise<string>;
}

/** Create a real ClaudeClient that calls the Anthropic Messages API. */
export function createClaudeClient(apiKey: string): ClaudeClient {
  return {
    async complete(systemPrompt: string, userMessage: string): Promise<string> {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `Claude API error: ${response.status} ${response.statusText} — ${body}`,
        );
      }

      const data = (await response.json()) as {
        content: { text: string }[];
      };
      return data.content[0].text;
    },
  };
}
