import { NextResponse } from "next/server";
import { createUser, EmailAlreadyRegisteredError, isAuthConfigured, startSession } from "@/lib/auth";
import { checkPublicRateLimit } from "@/lib/server/rate-limit";
import { signUpSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!isAuthConfigured()) return NextResponse.json({ error: "Account storage is still being configured." }, { status: 503 });
  const limit = checkPublicRateLimit(request, "auth-sign-up", 5);
  if (!limit.allowed) return NextResponse.json({ error: `Too many attempts. Try again in ${limit.retryAfterSeconds} seconds.` }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Please complete the sign-up form." }, { status: 400 });
  }

  const parsed = signUpSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Enter your name, a valid email, and a password with at least 8 characters." }, { status: 400 });

  try {
    const userId = await createUser(parsed.data.email, parsed.data.password, parsed.data.displayName);
    await startSession(userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof EmailAlreadyRegisteredError) return NextResponse.json({ error: error.message }, { status: 409 });
    throw error;
  }
}
