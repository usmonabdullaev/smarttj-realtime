import { UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  AuthService,
  extractToken,
  ValidateRequest,
  WsJwtGuard,
} from '../auth/index.js';
import { LoggerService } from '../logger/logger.service.js';
import { RedisService } from '../redis/redis.service.js';
import { JoinOrderDto, UpdateLocationDto } from './dto/index.js';

@UseGuards(WsJwtGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    exceptionFactory: (errors) => {
      const messages = errors
        .map((err) => Object.values(err.constraints || {}).join(', '))
        .join('; ');
      return new WsException(messages);
    },
  }),
)
@WebSocketGateway({ namespace: 'realtime/v1/order', cors: { origin: '*' } })
export class OrderGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new LoggerService(OrderGateway.name);

  constructor(
    private readonly redis: RedisService,
    private readonly authService: AuthService,
  ) {}

  // Срабатывает при подключении клиента: проверяем JWT токен
  async handleConnection(client: Socket) {
    const token = extractToken(client);

    if (!token) {
      this.logger.warn(`Connection rejected: no token provided (${client.id})`);
      client.emit('authError', { message: 'Unauthorized: Token is missing' });
      client.disconnect(true);
      return;
    }

    try {
      const payload: ValidateRequest =
        await this.authService.verifyToken(token);
      client.data = client.data || {};
      client.data.user = payload;
      this.logger.log(
        `Client connected: ${client.id} (userId: ${payload.userId}, role: ${payload.role})`,
      );
    } catch (error: any) {
      this.logger.warn(
        `Connection rejected: invalid token (${client.id}) - ${error?.message}`,
      );
      client.emit('authError', {
        message: error?.message || 'Unauthorized: Invalid token',
      });
      client.disconnect(true);
    }
  }

  // Срабатывает при отключении
  handleDisconnect(client: Socket) {
    const user = client.data?.user as ValidateRequest | undefined;
    const userInfo = user ? ` (user: ${user.userId})` : '';
    this.logger.log(`Client disconnected: ${client.id}${userInfo}`);
  }

  /**
   * Клиент (покупатель или курьер) подписывается на обновления конкретного заказа
   * Событие: joinOrderRoom
   */
  @SubscribeMessage('joinOrderRoom')
  async handleJoinRoom(
    @MessageBody() data: JoinOrderDto,
    @ConnectedSocket() client: Socket,
  ) {
    const room = this.generateRoomKey(data.orderId, data.partnerId);

    await client.join(room);

    const redisData = await this.redis.get<UpdateLocationDto>(room);

    if (redisData) {
      client.emit('orderLocationUpdated', redisData);
    }

    return { status: 'joined', data: redisData };
  }

  /**
   * Курьер отправляет свои актуальные координаты
   * Событие: updateLocation
   * Доступно ТОЛЬКО курьерам (PARTNER или PARTNER_EMPLOYEE)
   */
  @SubscribeMessage('updateLocation')
  async handleUpdateLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: UpdateLocationDto,
  ) {
    const user = client.data?.user as ValidateRequest | undefined;

    // Проверка роли: только PARTNER и PARTNER_EMPLOYEE являются курьерами
    if (user?.role !== 'PARTNER' && user?.role !== 'PARTNER_EMPLOYEE') {
      this.logger.warn(
        `Forbidden location update attempt by userId: ${user?.userId}, role: ${user?.role}`,
      );
      throw new WsException(
        'Forbidden: Only couriers (PARTNER / PARTNER_EMPLOYEE) can update location',
      );
    }

    const room = this.generateRoomKey(data.orderId, data.partnerId);

    const locationData: UpdateLocationDto = {
      orderId: data.orderId,
      partnerId: data.partnerId,
      latitude: data.latitude,
      longitude: data.longitude,
      bearing: data.bearing,
      speed: data.speed,
      timestamp: data.timestamp ?? Date.now(),
    };

    await this.redis.set(room, locationData, 1800); // 30 минут

    // Вещаем координаты всем в этой комнате, исключая самого отправителя (курьера)
    client.to(room).emit('orderLocationUpdated', locationData);

    return { status: 'broadcasted' };
  }

  private generateRoomKey(orderId: string, partnerId: string): string {
    return `order:${orderId}:partner:${partnerId}`;
  }
}
