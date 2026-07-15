import { categories, type Category } from "@/lib/budget";
import type { z } from "zod";
import { analysisResultSchema, coachContextSchema, coachPlanSchema, type CoachContext, type CoachResult, type ExpenseAnalysis } from "@/lib/ai/types";
import type { expenseAnalysisRequestSchema } from "@/lib/validation";

const GEMINI_DEFAULT_MODEL = "gemini-3.1-flash-lite";
const OPENAI_DEFAULT_MODEL = "gpt-5.6";

type AiProvider = "openai" | "gemini" | "local";
type JsonSchema = Record<string, unknown>;

const categoryRules: Array<[Category, RegExp]> = [
  ["Food & dining", /coffee|cafe|restaurant|grocery|market|pizza|lunch|dinner|snack|meal/i],
  ["Housing", /rent|hall|housing|utility|electric|internet/i],
  ["Transport", /metro|transit|bus|train|uber|lyft|gas|parking/i],
  ["School", /book|course|tuition|school|lab|print|supplies/i],
  ["Subscriptions", /subscription|spotify|netflix|stream|membership|cloud/i],
  ["Fun", /movie|concert|game|bowling|museum|ticket/i],
];

type AnalysisInput = z.infer<typeof expenseAnalysisRequestSchema>;

export function getConfiguredProvider(env: Record<string, string | undefined> = process.env): AiProvider {
  const configured = env.AI_PROVIDER?.toLowerCase();
  if (configured === "openai" || configured === "gemini" || configured === "local") return configured;
  return env.GEMINI_API_KEY ? "gemini" : "local";
}

function geminiModel() {
  return process.env.GEMINI_MODEL ?? GEMINI_DEFAULT_MODEL;
}

function openaiModel() {
  return process.env.OPENAI_MODEL ?? OPENAI_DEFAULT_MODEL;
}

const expenseOutputSchema: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["category", "confidence", "rationale", "insight", "action"],
  properties: {
    category: { type: "string", enum: categories },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    rationale: { type: "string" },
    insight: { type: "string" },
    action: { type: "string" },
  },
};

const coachOutputSchema: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "watchouts", "actions", "estimatedImpactCents"],
  properties: {
    summary: { type: "string" },
    watchouts: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "message"],
        properties: {
          category: { type: "string", enum: categories },
          message: { type: "string" },
        },
      },
    },
    actions: {
      type: "array",
      minItems: 2,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail", "estimatedImpactCents"],
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          estimatedImpactCents: { type: "integer", minimum: 0 },
        },
      },
    },
    estimatedImpactCents: { type: "integer", minimum: 0 },
  },
};

export function getLocalExpenseAnalysis(input: AnalysisInput): ExpenseAnalysis {
  const text = `${input.merchant} ${input.description}`;
  const category = categoryRules.find(([, pattern]) => pattern.test(text))?.[0] ?? "Other";
  const projectedCents = input.monthlySpentCents + input.amountCents;
  const remainingCents = Math.max(input.monthlyBudgetCents - projectedCents, 0);
  const percent = Math.round((projectedCents / input.monthlyBudgetCents) * 100);

  return {
    category,
    confidence: category === "Other" ? 0.58 : 0.88,
    rationale: `The merchant or description matches Pocket Semester's ${category} rules.`,
    insight: `This expense puts you at ${percent}% of this month’s plan, with $${(remainingCents / 100).toFixed(0)} left.`,
    action:
      category === "Food & dining"
        ? "Plan two lower-cost meals this week to protect your flexible spending."
        : "Check this category before your next non-essential purchase.",
    source: "local",
    model: null,
  };
}

async function geminiJson<T>(prompt: string, schema: { parse: (value: unknown) => T }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini is not configured.");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel()}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
      signal: AbortSignal.timeout(12_000),
    },
  );

  if (!response.ok) throw new Error(`Gemini request failed with ${response.status}.`);

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") throw new Error("Gemini returned no structured result.");

  return schema.parse(JSON.parse(text));
}

export function extractOpenAiOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") throw new Error("OpenAI returned an invalid response.");
  const response = payload as { output_text?: unknown; output?: unknown };
  if (typeof response.output_text === "string" && response.output_text.trim()) return response.output_text;
  if (!Array.isArray(response.output)) throw new Error("OpenAI returned no structured result.");

  for (const item of response.output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const output = part as { type?: unknown; text?: unknown };
      if (output.type === "output_text" && typeof output.text === "string" && output.text.trim()) return output.text;
    }
  }

  throw new Error("OpenAI returned no structured result.");
}

async function openaiJson<T>(prompt: string, schema: { parse: (value: unknown) => T }, name: string, outputSchema: JsonSchema) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI is not configured.");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: openaiModel(),
      store: false,
      input: [
        { role: "system", content: "Return only the requested structured JSON. Keep the advice practical, supportive, and concise." },
        { role: "user", content: prompt },
      ],
      text: {
        format: {
          type: "json_schema",
          name,
          strict: true,
          schema: outputSchema,
        },
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) throw new Error(`OpenAI request failed with ${response.status}.`);
  const payload = await response.json();
  return schema.parse(JSON.parse(extractOpenAiOutputText(payload)));
}

export async function analyzeExpense(input: AnalysisInput): Promise<ExpenseAnalysis> {
  const fallback = getLocalExpenseAnalysis(input);
  const provider = getConfiguredProvider();
  if (provider === "local") return fallback;

  const prompt = `You are a careful budgeting assistant for university students.
Categorize one expense and recommend one concrete, non-judgmental next step.

Expense:
- Merchant: ${input.merchant}
- Description: ${input.description || "None provided"}
- Amount: $${(input.amountCents / 100).toFixed(2)}
- Spent this month before expense: $${(input.monthlySpentCents / 100).toFixed(2)}
- Monthly budget: $${(input.monthlyBudgetCents / 100).toFixed(2)}

Return only JSON matching this exact shape:
{"category":"one of: ${categories.join(", ")}","confidence":0.0,"rationale":"max 180 chars explaining the category","insight":"max 240 chars","action":"max 180 chars"}`;

  try {
    const resultSchema = { parse: (value: unknown) => analysisResultSchema.omit({ source: true, model: true }).parse(value) };
    if (provider === "openai") {
      const result = await openaiJson(prompt, resultSchema, "expense_analysis", expenseOutputSchema);
      return { ...result, source: "openai", model: openaiModel() };
    }
    const result = await geminiJson(prompt, resultSchema);
    return { ...result, source: "gemini", model: geminiModel() };
  } catch (error) {
    console.error("Expense analysis unavailable", error instanceof Error ? error.message : "Unknown provider error");
    return fallback;
  }
}

export async function generateCoachPlan(context: CoachContext): Promise<CoachResult> {
  const parsed = coachContextSchema.parse(context);
  const provider = getConfiguredProvider();
  if (provider === "local") {
    return { status: "unavailable", reason: "AI coaching is not configured yet." };
  }

  const prompt = `You are Pocket Semester’s thoughtful budget coach for university students.
Use only the aggregate budget facts below. Give practical, non-judgmental guidance. Do not provide investment, tax, credit, or legal advice.

Monthly budget data:
${JSON.stringify(parsed)}

Return only JSON matching this exact shape:
{
  "summary":"max 320 chars",
  "watchouts":[{"category":"one listed category","message":"max 180 chars"}],
  "actions":[{"title":"max 80 chars","detail":"max 220 chars","estimatedImpactCents":0}],
  "estimatedImpactCents":0
}

Return 2 or 3 actions. Each action should be specific to this month and use a conservative dollar estimate in cents.`;

  try {
    if (provider === "openai") {
      const plan = await openaiJson(prompt, coachPlanSchema, "coach_plan", coachOutputSchema);
      return { status: "ready", plan, source: "openai", model: openaiModel() };
    }
    const plan = await geminiJson(prompt, coachPlanSchema);
    return { status: "ready", plan, source: "gemini", model: geminiModel() };
  } catch (error) {
    console.error("Coach plan unavailable", error instanceof Error ? error.message : "Unknown provider error");
    return {
      status: "unavailable",
      reason: "Your personalized plan could not be refreshed. Your transactions and budget are still saved.",
    };
  }
}
