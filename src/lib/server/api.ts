import { NextResponse } from "next/server";
import { AuthenticationRequiredError, requireCurrentUserId } from "@/lib/auth";
import { isDatabaseConfigured } from "@/db";

export async function requireApiUser() {
  if (!isDatabaseConfigured()) {
    return { response: NextResponse.json({ error: "Account storage is still being configured." }, { status: 503 }) } as const;
  }

  try {
    return { userId: await requireCurrentUserId() } as const;
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return { response: NextResponse.json({ error: "Sign in is required." }, { status: 401 }) } as const;
    }
    throw error;
  }
}

export async function readJson(request: Request) {
  try {
    return { data: await request.json() } as const;
  } catch {
    return { response: NextResponse.json({ error: "Please send valid JSON." }, { status: 400 }) } as const;
  }
}
