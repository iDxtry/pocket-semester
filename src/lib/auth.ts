import { auth } from "@clerk/nextjs/server";

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Sign in is required to access this data.");
    this.name = "AuthenticationRequiredError";
  }
}

export function isClerkConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

export async function getCurrentUserId() {
  if (!isClerkConfigured()) return null;
  const { userId } = await auth();
  return userId;
}

export async function requireCurrentUserId() {
  const userId = await getCurrentUserId();
  if (!userId) throw new AuthenticationRequiredError();
  return userId;
}
