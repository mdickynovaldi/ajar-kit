/* AjarKit — rate limiter sederhana (sliding window, in-memory).
   Cukup utk deployment single-instance (next start / 1 region).
   TODO skala-besar: ganti dgn store terdistribusi (mis. Upstash Redis)
   karena memori tidak dibagi antar instance serverless. */

import "server-only";

const buckets = new Map<string, number[]>();

/** true = DIIZINKAN; false = lewat batas (limit per windowMs per key) */
export function allowRequest(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  const arr = (buckets.get(key) ?? []).filter((t) => t > cutoff);
  if (arr.length >= limit) {
    buckets.set(key, arr);
    return false;
  }
  arr.push(now);
  buckets.set(key, arr);
  // jaga memori: buang bucket basi sesekali
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => t <= cutoff)) buckets.delete(k);
    }
  }
  return true;
}
