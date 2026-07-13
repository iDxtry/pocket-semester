import { NextResponse } from "next/server";
import { z } from "zod";
import { categories, type Analysis, type Category } from "@/lib/budget";

const requestSchema = z.object({
  merchant: z.string().trim().min(1).max(80),
  description: z.string().trim().max(180).default(""),
  amount: z.number().positive().max(100000),
  monthlySpent: z.number().nonnegative().max(1000000),
  monthlyBudget: z.number().positive().max(1000000),
});

const analysisSchema = z.object({
  category: z.enum(categories),
  confidence: z.number().min(0).max(1),
  insight: z.string().min(1).max(240),
  action: z.string().min(1).max(180),
});

const categoryRules: Array<[Category, RegExp]> = [
  ["Food & dining", /coffee|cafe|restaurant|grocery|market|pizza|lunch|dinner|snack/i],
  ["Housing", /rent|hall|housing|utility|electric|internet/i],
  ["Transport", /metro|transit|bus|train|uber|lyft|gas|parking/i],
  ["School", /book|course|tuition|school|lab|print|supplies/i],
  ["Subscriptions", /subscription|spotify|netflix|stream|membership|cloud/i],
  ["Fun", /movie|concert|game|bowling|museum|ticket/i],
];

function ruleBasedAnalysis(input: z.infer<typeof requestSchema>): Analysis {
  const text = `${input.merchant} ${input.description}`;
  const category = categoryRules.find(([, pattern]) => pattern.test(text))?.[0] ?? "Other";
  const projected = input.monthlySpent + input.amount;
  const remaining = Math.max(input.monthlyBudget - projected, 0);
  const percent = Math.round((projected / input.monthlyBudget) * 100);

  return {
    category,
    confidence: category === "Other" ? 0.58 : 0.88,
    insight: `This purchase puts you at ${percent}% of your monthly plan, with $${remaining.toFixed(0)} left.`,
    action:
      category === "Food & dining"
        ? "Plan two campus meals this week to protect your weekend budget."
        : "Check this category again before your next non-essential purchase.",
    source: "rules",
  };
}

async function analyzeWithGemini(
  input: z.infer<typeof requestSchema>,
  apiKey: string,
): Promise<Analysis> {
  const prompt = `You are a careful budgeting assistant for university students.
Categorize this expense and give one concrete, non-judgmental recommendation.

Expense:
- Merchant: ${input.merchant}
- Description: ${input.description || "None provided"}
- Amount: $${input.amount.toFixed(2)}
- Spent this month before this expense: $${input.monthlySpent.toFixed(2)}
- Monthly budget: $${input.monthlyBudget.toFixed(2)}

Return only JSON with this shape:
{"category":"one of: ${categories.join(", ")}","confidence":0.0,"insight":"max 240 chars","action":"max 180 chars"}`;

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
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
      signal: AbortSignal.timeout(12000),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed with ${response.status}`);
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") throw new Error("Gemini returned no text");

  return { ...analysisSchema.parse(JSON.parse(text)), source: "gemini" };
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please provide a merchant and a valid positive amount." },
      { status: 400 },
    );
  }

  const fallback = ruleBasedAnalysis(parsed.data);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) return NextResponse.json(fallback);

  try {
    return NextResponse.json(await analyzeWithGemini(parsed.data, apiKey));
  } catch (error) {
    console.error("AI analysis unavailable", error instanceof Error ? error.message : error);
    return NextResponse.json(fallback);
  }
}
