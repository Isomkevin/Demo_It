import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const useOpenRouter = !!process.env.OPENROUTER_API_KEY;

let anthropicClient: Anthropic | null = null;
if (!useOpenRouter) {
  anthropicClient = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || "",
  });
}

export const MODEL = useOpenRouter
  ? process.env.OPENROUTER_MODEL || "anthropic/claude-3.7-sonnet"
  : "claude-3-7-sonnet-20250219";

/**
 * Call the LLM and parse structured JSON output.
 * Retries up to 3 times on parse failure.
 */
export async function callLLM<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodType<T>,
  maxTokens = 4096
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const retryHint =
      attempt > 1
        ? "\n\nIMPORTANT: Your previous response failed JSON parsing. Return ONLY valid JSON, no markdown, no explanation."
        : "";

    let rawText = "";

    try {
      if (useOpenRouter) {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.WEB_URL || "http://localhost:3000",
            "X-Title": "Demo Copilot",
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt + retryHint },
            ],
            max_tokens: maxTokens,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenRouter API error: ${response.status} ${await response.text()}`);
        }

        const data = await response.json();
        rawText = data.choices?.[0]?.message?.content || "";
      } else {
        if (!anthropicClient) throw new Error("Anthropic client not initialized");
        const response = await anthropicClient.messages.create({
          model: MODEL,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt + retryHint }],
        });

        rawText = response.content[0]?.type === "text" ? response.content[0].text : "";
      }
    } catch (err) {
      console.error(`LLM network/API error on attempt ${attempt}:`, err);
      lastError = err;
      continue; // retry on network errors too
    }

    // Extract JSON from response (handles markdown code fences)
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) ||
      rawText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);

    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : rawText;

    try {
      const parsed = JSON.parse(jsonStr.trim());
      return schema.parse(parsed);
    } catch (err) {
      lastError = err;
      console.warn(`LLM attempt ${attempt} failed:`, err);
    }
  }

  throw new Error(`LLM call failed after 3 attempts: ${lastError}`);
}
