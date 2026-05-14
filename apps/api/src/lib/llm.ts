import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const MODEL = "claude-3-7-sonnet-20250219"; // Using updated anthropic model, original prompt suggested 3.5

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

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt + retryHint }],
    });

    const rawText =
      response.content[0]?.type === "text" ? response.content[0].text : "";

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
