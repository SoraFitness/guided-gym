import { getRequest } from "@tanstack/react-start/server";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  limit: number;
  windowMs: number;
  identity?: string;
}

const MAX_BUCKETS = 5_000;
const buckets = new Map<string, RateLimitBucket>();

function requestIp(): string {
  let request: Request | undefined;
  try {
    request = getRequest();
  } catch {
    // Unit tests and direct server-side calls may not have request context.
  }

  const headers = request?.headers;
  return (
    headers?.get("cf-connecting-ip")?.trim() ||
    headers?.get("x-real-ip")?.trim() ||
    headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local"
  );
}

function pruneExpiredBuckets(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }

  if (buckets.size >= MAX_BUCKETS) {
    const oldest = [...buckets.entries()]
      .sort((a, b) => a[1].resetAt - b[1].resetAt)
      .slice(0, Math.ceil(MAX_BUCKETS * 0.1));
    for (const [key] of oldest) buckets.delete(key);
  }
}

export function claimRateLimit(scope: string, options: RateLimitOptions) {
  const now = Date.now();
  pruneExpiredBuckets(now);

  const identity = options.identity?.trim() || requestIp();
  const key = `${scope}:${identity}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return;
  }

  if (current.count >= options.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1_000));
    throw new Error(`RATE_LIMITED:${retryAfterSeconds}`);
  }

  current.count += 1;
}

export function assertRequestSize(request: Request, maxBytes: number) {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new Error("REQUEST_TOO_LARGE");
  }
}

export function rateLimitResponse(error: unknown): Response | null {
  const message = error instanceof Error ? error.message : "";
  if (message === "REQUEST_TOO_LARGE") {
    return new Response("Request is too large", { status: 413 });
  }
  if (!message.startsWith("RATE_LIMITED:")) return null;

  const retryAfter = message.slice("RATE_LIMITED:".length) || "60";
  return new Response("Too many requests", {
    status: 429,
    headers: { "retry-after": retryAfter },
  });
}

export function resetRateLimitsForTests() {
  buckets.clear();
}
