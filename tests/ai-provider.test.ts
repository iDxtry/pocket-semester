import assert from "node:assert/strict";
import test from "node:test";
import { analysisResultSchema } from "../src/lib/ai/types";
import { extractOpenAiOutputText, getConfiguredProvider, getLocalExpenseAnalysis } from "../src/lib/ai/provider";

test("provider selection keeps Gemini as development default and recognizes the final OpenAI mode", () => {
  assert.equal(getConfiguredProvider({ GEMINI_API_KEY: "development-only" }), "gemini");
  assert.equal(getConfiguredProvider({ AI_PROVIDER: "openai" }), "openai");
  assert.equal(getConfiguredProvider({ AI_PROVIDER: "local", GEMINI_API_KEY: "development-only" }), "local");
});

test("Responses API structured output is extracted from both supported response shapes", () => {
  const direct = extractOpenAiOutputText({ output_text: '{"category":"Food & dining"}' });
  assert.equal(direct, '{"category":"Food & dining"}');

  const nested = extractOpenAiOutputText({
    output: [{ type: "message", content: [{ type: "output_text", text: '{"summary":"Keep it simple."}' }] }],
  });
  assert.equal(nested, '{"summary":"Keep it simple."}');
  assert.throws(() => extractOpenAiOutputText({ output: [] }), /no structured result/i);
});

test("expense provenance stays truthful for local fallback and OpenAI results", () => {
  const local = getLocalExpenseAnalysis({
    merchant: "Campus Cafe",
    description: "Coffee before class",
    amountCents: 575,
    monthlySpentCents: 12000,
    monthlyBudgetCents: 30000,
  });
  assert.equal(local.source, "local");
  assert.equal(local.model, null);

  const openai = analysisResultSchema.safeParse({
    category: "Food & dining",
    confidence: 0.91,
    insight: "This keeps food spending within the current plan.",
    action: "Use one campus meal this week.",
    source: "openai",
    model: "gpt-5.6",
  });
  assert.equal(openai.success, true);
});
