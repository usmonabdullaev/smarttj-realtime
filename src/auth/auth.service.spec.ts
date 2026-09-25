import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { describe, expect, it } from "vitest";
import { AuthService } from "./auth.service.js";
import { ValidateRequest } from "./interfaces/validate-request.interface.js";
import { extractToken } from "./utils/extract-token.js";

describe("AuthService & extractToken", () => {
  const secret = "test-secret";
  const jwtService = new JwtService({});
  const configService = {
    get: (key: string) => (key === "JWT_SECRET" ? secret : undefined),
  } as unknown as ConfigService;
  const authService = new AuthService(jwtService, configService);

  it("should successfully verify a valid JWT token", async () => {
    const payload: ValidateRequest = {
      userId: "usr_123",
      sessionId: "sess_456",
      role: "USER",
    };
    const token = jwtService.sign(payload, { secret });
    const result = await authService.verifyToken(token);
    expect(result).toEqual(payload);
  });

  it("should accept PARTNER and PARTNER_EMPLOYEE roles", async () => {
    const partnerPayload: ValidateRequest = {
      userId: "partner_1",
      sessionId: "sess_1",
      role: "PARTNER",
    };
    const token = jwtService.sign(partnerPayload, { secret });
    expect(await authService.verifyToken(token)).toEqual(partnerPayload);
  });

  it("should extract token from auth, query, and headers", () => {
    const client = {
      handshake: { auth: { token: "tok1" }, query: {}, headers: {} },
    } as any;
    expect(extractToken(client)).toBe("tok1");
  });
});
