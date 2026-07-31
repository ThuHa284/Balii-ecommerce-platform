import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private readonly client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
    });
  }

  get(key: string) {
    return this.client.get(key);
  }

  set(key: string, value: string, ttl?: number) {
    if (ttl) {
      return this.client.set(key, value, 'EX', ttl);
    }

    return this.client.set(key, value);
  }

  del(key: string) {
    return this.client.del(key);
  }

  incr(key: string) {
    return this.client.incr(key);
  }

  expire(key: string, ttl: number) {
    return this.client.expire(key, ttl);
  }

  async consumeRateLimit(key: string, limit: number, windowSeconds: number) {
    const result = (await this.client.eval(
      `
      local current = redis.call('INCR', KEYS[1])
      if current == 1 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
      end
      local ttl = redis.call('TTL', KEYS[1])
      return { current, ttl }
      `,
      1,
      key,
      windowSeconds,
    )) as [number, number];

    return {
      current: Number(result[0]),
      ttl: Math.max(Number(result[1]), 1),
      allowed: Number(result[0]) <= limit,
    };
  }

  async acquireLock(key: string, token: string, ttlMs: number) {
    const result = await this.client.set(key, token, 'PX', ttlMs, 'NX');
    return result === 'OK';
  }

  async releaseLock(key: string, token: string) {
    return this.client.eval(
      `
      if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('del', KEYS[1])
      end
      return 0
      `,
      1,
      key,
      token,
    );
  }
}
