export type UserRole = "USER" | "PARTNER" | "PARTNER_EMPLOYEE";

export interface ValidateRequest {
  userId: string;
  sessionId: string;
  role: UserRole;
}
