import { NextResponse } from "next/server";
import { authenticateUser, isAuthConfigured, startSession } from "@/lib/auth";
import { checkPublicRateLimit } from "@/lib/server/rate-limit";
import { signInSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!isAuthConfigured()) return NextResponse.json({ error: "Account storage is still being configured." }, { status: 503 });
  const limit = checkPublicRateLimit(request, "auth-sign-in", 12);
  if (!limit.allowed) return NextResponse.json({ error: `Too many attempts. Try again in ${limit.retryAfterSeconds} seconds.` }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Please enter your email and password." }, { status: 400 });
  }

  const parsed = signInSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and a password with at least 8 characters." }, { status: 400 });

  const userId = await authenticateUser(parsed.data.email, parsed.data.password);
  if (!userId) return NextResponse.json({ error: "That email or password is incorrect." }, { status: 401 });
  await startSession(userId);
  return NextResponse.json({ ok: true });
}
