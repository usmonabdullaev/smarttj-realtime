import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { WsException } from "@nestjs/websockets";
import { Socket } from "socket.io";
import { AuthService } from "../auth.service.js";
import { extractToken } from "../utils/extract-token.js";

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();

    if (client.data?.user) {
      return true;
    }

    const token = extractToken(client);
    if (!token) {
      throw new WsException("Unauthorized: No token provided");
    }

    try {
      const user = await this.authService.verifyToken(token);
      client.data = client.data || {};
      client.data.user = user;
      return true;
    } catch {
      throw new WsException("Unauthorized: Invalid or expired token");
    }
  }
}
