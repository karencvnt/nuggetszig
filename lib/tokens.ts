import crypto from "crypto";

export function generateToken(): string {
  return crypto.randomUUID();
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function tokenExpiresAt(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}
