import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      squad?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    squad?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    squad?: string;
  }
}
