/**
 * In production, calls go to same-origin /api/* and Next.js rewrites proxy to Render.
 * Set BACKEND_URL on Vercel (server) or NEXT_PUBLIC_API_URL for direct calls.
 */
function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }
  // Browser: use relative path → Vercel rewrite → backend
  if (typeof window !== 'undefined') {
    return '';
  }
  // SSR fallback
  return (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:4000'
  ).replace(/\/$/, '');
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const base = getApiBase();
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const message =
      typeof err.error === 'string'
        ? err.error
        : res.status === 404
          ? 'Backend not found — check Render service is running'
          : res.status === 503
            ? 'Backend unavailable — Render service may be suspended or waking up'
            : 'Request failed';
    throw new Error(message);
  }

  return res.json();
}
