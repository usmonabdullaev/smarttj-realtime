import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.module.js';

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  // Базовые операции с TTL
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const data = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await this.redis.set(key, data, 'EX', ttlSeconds);
    } else {
      await this.redis.set(key, data);
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  }

  async del(key: string): Promise<number> {
    return this.redis.del(key);
  }

  // Pub/Sub: Отправка событий
  async publish(channel: string, message: any): Promise<number> {
    const payload =
      typeof message === 'string' ? message : JSON.stringify(message);
    return this.redis.publish(channel, payload);
  }

  // Для низкоуровневых команд (GEO, Hashes, Lists)
  getClient(): Redis {
    return this.redis;
  }
}
