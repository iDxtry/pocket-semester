import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { authSessions, authUsers } from "@/db/schema";
import { getDb, isDatabaseConfigured } from "@/db";

export const SESSION_COOKIE = "pocket_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Sign in is required to access this data.");
    this.name = "AuthenticationRequiredError";
  }
}

export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("An account with that email already exists.");
    this.name = "EmailAlreadyRegisteredError";
  }
}

export function isAuthConfigured() {
  return isDatabaseConfigured();
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, expectedHex] = storedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

export async function createUser(email: string, password: string, displayName: string) {
  const normalizedEmail = normalizeEmail(email);
  const db = getDb();
  const existing = await db.select({ id: authUsers.id }).from(authUsers).where(eq(authUsers.email, normalizedEmail)).limit(1);
  if (existing[0]) throw new EmailAlreadyRegisteredError();

  try {
    const rows = await db
      .insert(authUsers)
      .values({ email: normalizedEmail, passwordHash: hashPassword(password), displayName: displayName.trim() })
      .returning({ id: authUsers.id });
    return rows[0].id;
  } catch (error) {
    if (error instanceof Error && /unique|duplicate/i.test(error.message)) throw new EmailAlreadyRegisteredError();
    throw error;
  }
}

export async function authenticateUser(email: string, password: string) {
  const rows = await getDb()
    .select({ id: authUsers.id, passwordHash: authUsers.passwordHash })
    .from(authUsers)
    .where(eq(authUsers.email, normalizeEmail(email)))
    .limit(1);
  const user = rows[0];
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  return user.id;
}

export async function startSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_TTL_MS);
  await getDb().insert(authSessions).values({ tokenHash: hashSessionToken(token), userId, expiresAt: expires });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(expires));
}

export async function getCurrentUserId() {
  if (!isAuthConfigured()) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await getDb()
    .select({ userId: authSessions.userId, expiresAt: authSessions.expiresAt })
    .from(authSessions)
    .where(eq(authSessions.tokenHash, hashSessionToken(token)))
    .limit(1);
  const session = rows[0];
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;
  return session.userId;
}

export async function endCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token && isAuthConfigured()) {
    await getDb().delete(authSessions).where(eq(authSessions.tokenHash, hashSessionToken(token)));
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function requireCurrentUserId() {
  const userId = await getCurrentUserId();
  if (!userId) throw new AuthenticationRequiredError();
  return userId;
}
