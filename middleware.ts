import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/subjects/:path*", "/test/:path*", "/results/:path*", "/api/tests/:path*"],
};
