import { Socket } from "socket.io";

export function extractToken(client: Socket): string | null {
  const authToken = client.handshake.auth?.token;
  if (typeof authToken === "string" && authToken.trim()) {
    return authToken.trim();
  }

  const queryToken = client.handshake.query?.token;
  if (typeof queryToken === "string" && queryToken.trim()) {
    return queryToken.trim();
  }
  if (Array.isArray(queryToken) && queryToken[0]) {
    return queryToken[0].trim();
  }

  const authHeader = client.handshake.headers["authorization"];
  if (typeof authHeader === "string" && authHeader.trim()) {
    const [bearer, token] = authHeader.split(" ");
    if (bearer === "Bearer" && token) {
      return token.trim();
    }
    return authHeader.trim();
  }

  return null;
}
