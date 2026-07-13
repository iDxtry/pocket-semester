type WindowEntry = { count: number; resetAt: number };

const windows = new Map<string, WindowEntry>();

export function checkPublicRateLimit(request: Request, scope: string, limit = 8, windowMs = 10 * 60 * 1000) {
  const forwarded = request.headers.get("x-forwarded-for");
  const identifier = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const key = `${scope}:${identifier}`;
  const now = Date.now();
  const previous = windows.get(key);

  if (!previous || previous.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (previous.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((previous.resetAt - now) / 1000) };
  }

  previous.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
