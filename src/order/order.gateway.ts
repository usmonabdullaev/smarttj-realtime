import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LoggerService } from '../logger/logger.service.js';
import { RedisService } from '../redis/redis.service.js';

interface JoinOrderDto {
  orderId: string;
  partnerId: string;
}

interface UpdateLocationDto {
  orderId: string;
  partnerId: string;
  latitude: number;
  longitude: number;
  bearing?: number; // Направление движения (угол поворота иконки на карте)
  speed?: number;
  timestamp?: number;
}

@WebSocketGateway({ namespace: 'realtime/v1/order', cors: { origin: '*' } })
export class OrderGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new LoggerService(OrderGateway.name);

  constructor(private readonly redis: RedisService) {}

  // Срабатывает при подключении клиента
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  // Срабатывает при отключении
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Клиент (покупатель) подписывается на обновления конкретного заказа
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
   */
  @SubscribeMessage('updateLocation')
  async handleUpdateLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: UpdateLocationDto,
  ) {
    const room = this.generateRoomKey(data.orderId, data.partnerId);

    const locationData = {
      orderId: data.orderId,
      partnerId: data.partnerId,
      latitude: data.latitude,
      longitude: data.longitude,
      bearing: data.bearing,
      speed: data.speed,
      timestamp: Date.now(),
    } as UpdateLocationDto;

    await this.redis.set(room, locationData, 1800); // 30 minute

    // Вещаем координаты всем в этой комнате, исключая самого отправителя (курьера)
    client.to(room).emit('orderLocationUpdated', locationData);

    return { status: 'broadcasted' };
  }

  private generateRoomKey(orderId: string, partnerId: string) {
    return `order:${orderId}:partner:${partnerId}`;
  }
}
