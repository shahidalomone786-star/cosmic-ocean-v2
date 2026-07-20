import jwt from "jsonwebtoken";

const SECRET = process.env["SESSION_SECRET"];
if (!SECRET) throw new Error("SESSION_SECRET env var is required");

const EXPIRY = "7d";

export interface JwtPayload {
  sub: string; // user id
  email: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET!, { expiresIn: EXPIRY });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, SECRET!) as JwtPayload;
  } catch {
    return null;
  }
}

export const COOKIE_NAME = "cosmos_session";
export const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env["NODE_ENV"] === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: "/",
};
