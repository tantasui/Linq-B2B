import { Redis } from "@upstash/redis";
import { env, redisEnabled } from "./env";

const memory = new Map<string, { expiresAt: number; value: unknown }>();

let redis: Redis | null = null;

function getRedis() {
  if (!redisEnabled) return null;
  if (!redis) {
    redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL!,
      token: env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

export async function cached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const client = getRedis();
  if (client) {
    const value = await client.get<T>(key);
    if (value) return value;
    const fresh = await loader();
    await client.set(key, fresh, { ex: ttlSeconds });
    return fresh;
  }

  const item = memory.get(key);
  if (item && item.expiresAt > Date.now()) return item.value as T;
  const fresh = await loader();
  memory.set(key, { value: fresh, expiresAt: Date.now() + ttlSeconds * 1000 });
  return fresh;
}
