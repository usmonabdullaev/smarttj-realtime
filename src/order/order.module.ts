import { Module } from '@nestjs/common';
import { OrderGateway } from './order.gateway.js';
import { RedisModule } from '../redis/redis.module.js';

@Module({
  imports: [RedisModule],
  providers: [OrderGateway],
})
export class OrderModule {}
